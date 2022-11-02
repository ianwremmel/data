import assert from 'assert';

import {isNonNullType, isScalarType, GraphQLObjectType} from 'graphql';
import {snakeCase} from 'lodash';

/**
 * Generates the createItem function for a simple table
 */
export function createItemTemplate(objType: GraphQLObjectType) {
  const ttlInfo = extractTtlInfo(objType);

  const dateFields = Object.entries(objType.getFields())
    .filter(([, field]) => {
      let {type} = field;
      if (isNonNullType(type)) {
        type = type.ofType;
      }

      return isScalarType(type) && type.name === 'Date';
    })
    .map(([fieldName]) => fieldName);

  const ean: string[] = [];
  const eav: string[] = [];
  const unmarshall: string[] = [];
  const updatedExpressions: string[] = [];

  const fieldNames = Object.keys(objType.getFields()).sort();

  for (const fieldName of fieldNames) {
    if (fieldName === 'id') {
      ean.push(`'#id': 'id'`);
      unmarshall.push(`id: data.Attributes?.id`);
      continue;
    }

    if (fieldName === ttlInfo?.fieldName) {
      ean.push(`'#ttl': 'ttl'`);
      eav.push(`':ttl': now.getTime() + ${ttlInfo.duration}`);
      unmarshall.push(`${ttlInfo.fieldName}: new Date(data.Attributes?.ttl)`);
      updatedExpressions.push(`#ttl = :ttl`);
      continue;
    }

    if (fieldName === 'createdAt' || fieldName === 'updatedAt') {
      ean.push(`'#${fieldName}': '${snakeCase(fieldName)}'`);
      eav.push(`':${fieldName}': now.getTime()`);
      unmarshall.push(
        `${fieldName}: new Date(data.Attributes?.${snakeCase(fieldName)})`
      );
      updatedExpressions.push(`#${fieldName} = :${fieldName}`);
      continue;
    }

    ean.push(`'#${fieldName}': '${snakeCase(fieldName)}'`);
    eav.push(`':${fieldName}': input.${fieldName}`);
    if (dateFields.includes(fieldName)) {
      unmarshall.push(
        `${fieldName}: new Date(data.Attributes?.${snakeCase(fieldName)})`
      );
    } else {
      unmarshall.push(`${fieldName}: data.Attributes?.${snakeCase(fieldName)}`);
    }
    updatedExpressions.push(`#${fieldName} = :${fieldName}`);
  }

  ean.sort();
  eav.sort();
  updatedExpressions.sort();

  return `
export type Create${objType.name}Input = Omit<${
    objType.name
  }, 'createdAt'|'id'|'updatedAt'${ttlInfo ? `|'${ttlInfo.fieldName}'` : ''}>;

/**  */
export async function create${objType.name}(input: Create${
    objType.name
  }Input): Promise<${objType.name}> {
  const now = new Date();
${ensureTableTemplate(objType)}

  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const data = await ddbDocClient.send(new UpdateCommand({
      ConditionExpression: 'attribute_not_exists(#id)',
      ExpressionAttributeNames: {
${ean.map((e) => `        ${e},`).join('\n')}
      },
      ExpressionAttributeValues: {
${eav.map((e) => `        ${e},`).join('\n')}
      },
      Key: {
        id: \`${objType.name}#\${uuidv4()}\`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: 'SET ${updatedExpressions.join(', ')}',
  }));
  return {
${unmarshall.map((item) => `    ${item},`).join('\n')}
  }
}`;
}

/**
 * Generates the deleteItem function for a simple table
 */
export function deleteItemTemplate(objType: GraphQLObjectType) {
  return `
/**  */
export async function delete${objType.name}(id: string) {
${ensureTableTemplate(objType)}

  const {$metadata, Attributes, ...data} = await ddbDocClient.send(new DeleteCommand({
    ConditionExpression: 'attribute_exists(#id)',
    ExpressionAttributeNames: {
      '#id': 'id',
    },
    Key: {
      id,
    },
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'NONE',
    TableName: tableName,
  }));

  return data;
}
`;
}

/**
 * Generates the code for checking that the environment variables for this
 * tables's name has been set.
 */
function ensureTableTemplate(objType: GraphQLObjectType): string {
  return `  const tableName = process.env.TABLE_${snakeCase(
    objType.name
  ).toUpperCase()};
  assert(tableName, 'TABLE_${snakeCase(
    objType.name
  ).toUpperCase()} is not set');`;
}

type Nullable<T> = T | null;

/**
 * Parses a type that might have ttl info and returns its useful parts.
 */
function extractTtlInfo(type: GraphQLObjectType): Nullable<{
  duration: number;
  fieldName: string;
}> {
  const fields =
    type.astNode?.fields?.filter((field) =>
      field.directives?.map(({name}) => name.value).includes('ttl')
    ) ?? [];

  if (fields.length === 0) {
    return null;
  }

  assert(fields.length < 2, 'Only one ttl field is allowed per type');

  const field = fields?.[0];

  const fieldName = field?.name.value;
  const directive = field.directives?.find((d) => d.name.value === 'ttl');

  const arg = directive?.arguments?.find((a) => a.name.value === 'duration');

  assert(arg?.value.kind === 'StringValue', 'ttl duration must be a string');
  const duration = arg.value.value;

  const durationUnit = duration?.slice(-1);
  const durationValue = duration?.slice(0, -1);

  switch (durationUnit) {
    case 's':
      return {duration: Number(durationValue) * 1000, fieldName};
    case 'm':
      return {duration: Number(durationValue) * 1000 * 60, fieldName};
    case 'h':
      return {duration: Number(durationValue) * 1000 * 60 * 60, fieldName};
    case 'd':
      return {duration: Number(durationValue) * 1000 * 60 * 60 * 24, fieldName};
    default:
      throw new Error(
        `Invalid ttl duration: ${duration}. Unit must be one of s, m, h, d`
      );
  }
}
