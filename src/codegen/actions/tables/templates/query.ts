import assert from 'assert';

import {
  GraphQLObjectType,
  isListType,
  isNonNullType,
  isScalarType,
} from 'graphql';

import {extractTtlInfo} from '../../../common/fields';
import {
  getArg,
  getOptionalArg,
  hasDirective,
  unmarshalField,
} from '../../../common/helpers';
import {extractKeyInfo} from '../../../common/keys';

import {ensureTableTemplate} from './ensure-table';

/** helper */
function fieldNamesToTypes(
  type: GraphQLObjectType,
  argName: string
): {name: string; type: string}[] {
  const directive = type.astNode?.directives?.find(
    (d) => d.name.value === 'compositeKey'
  );
  assert(
    directive,
    `Expected type ${type.name} to have an @compositeKey directive`
  );

  const arg = getArg(argName, directive);
  assert(
    arg.value.kind === 'ListValue',
    `Expected @compositeKey directive argument "${argName}" to be a list`
  );
  return arg.value.values.map((v) => {
    assert(
      v.kind === 'StringValue',
      `Expected @compositeKey directive argument "${argName}" to be a list of strings`
    );
    const field = type.getFields()[v.value];
    assert(
      field,
      `Expected @compositeKey directive argument "${argName}" to be a list of fields on the object type`
    );

    let fieldType = field.type;
    if (isNonNullType(fieldType)) {
      fieldType = fieldType.ofType;
    }

    if (isScalarType(fieldType)) {
      return {name: v.value, type: `Scalars['${fieldType.name}']`};
    }

    assert(!isListType(fieldType), 'List types are not supported');

    return {
      name: field.name,
      type: fieldType.name,
    };
  });
}

/** helper */
function getPrefix(keyName: string, type: GraphQLObjectType): string {
  const directive = type.astNode?.directives?.find(
    (d) => d.name.value === 'compositeKey'
  );
  assert(
    directive,
    `Expected type ${type.name} to have an @compositeKey directive`
  );

  const prefix = getOptionalArg(`${keyName}Prefix`, directive);

  if (!prefix) {
    return '';
  }

  assert(
    prefix.value.kind === 'StringValue',
    `Expected @compositeKey directive argument "${keyName}Prefix" to be a string, but got ${prefix.value.kind}`
  );

  return prefix.value.value;
}

export interface QueryTplInput {
  type: GraphQLObjectType;
}

/** template */
export function queryTpl({type}: QueryTplInput) {
  const keyInfo = extractKeyInfo(type);
  const ttlInfo = extractTtlInfo(type);

  const consistent = hasDirective('consistent', type);

  const unmarshall: string[] = [];

  const fields = type.getFields();
  const fieldNames = Object.keys(fields).sort();

  for (const fieldName of fieldNames) {
    const field = fields[fieldName];

    if (keyInfo.fields.has(fieldName)) {
      // intentionally empty. if key fields need to do anything, they'll be
      // handled after the loop
    } else if (fieldName === 'version') {
      unmarshall.push(unmarshalField(field, '_v'));
    } else if (fieldName === ttlInfo?.fieldName) {
      unmarshall.push(unmarshalField(field, 'ttl'));
    } else if (fieldName === 'createdAt') {
      unmarshall.push(unmarshalField(field, '_ct'));
    } else if (fieldName === 'updatedAt') {
      unmarshall.push(unmarshalField(field, '_md'));
    } else {
      unmarshall.push(unmarshalField(field));
    }
  }

  unmarshall.push(...keyInfo.unmarshall);

  unmarshall.sort();

  const typeName = type.name;

  const pkFields = fieldNamesToTypes(type, 'pkFields');
  const skFields = fieldNamesToTypes(type, 'skFields');
  const pkPrefix = getPrefix('pk', type);
  const skPrefix = getPrefix('sk', type);

  const inputTypeName = `Query${typeName}Input`;
  const outputTypeName = `Query${typeName}Output`;

  const pkTemplate = [
    pkPrefix,
    ...pkFields.map((field) => `\${input.${field.name}}`),
  ].join('#');

  return `
export type ${inputTypeName} =
${[undefined, ...skFields]
  .map(
    (_, index) => `
{
${pkFields.map((f) => `  ${f.name}: ${f.type};`).join('\n')}
${skFields
  .slice(0, index)
  .map(
    (f, __, all) => `  ${f.name}${index === all.length ? '?' : ''}: ${f.type};`
  )
  .join('\n')}
}`
  )
  .join('|')}



export type ${outputTypeName} = MultiResultType<${typeName}>

/** query${typeName} */
export async function query${typeName}(input: Readonly<Query${typeName}Input>): Promise<Readonly<${outputTypeName}>> {
  ${ensureTableTemplate(type)}

  const pk = \`${pkTemplate}\`;
  const sk = ['${skPrefix}', ${skFields.map(
    (f) => `'${f.name}' in input && input.${f.name}`
  )}].filter(Boolean).join('#');

  const {ConsumedCapacity: capacity, Items: items = []} = await ddbDocClient.send(new QueryCommand({
    ConsistentRead: ${consistent},
    ExpressionAttributeNames: {
      '#pk': 'pk',
      '#sk': 'sk',
    },
    ExpressionAttributeValues: {
      ':pk': pk,
      ':sk': sk,
    },
    KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  }));

  assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

  return {
    capacity,
    items: items.map((item) => {
        assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected JSON.stringify({${keyInfo.inputToPrimaryKey
    .map((item) => `        ${item},`)
    .join(
      '\n'
    )}}) to to load items of type ${typeName} but got at \${item._et} instead\`));
      return {
${unmarshall.map((item) => `            ${item},`).join('\n')}
      };
    })
  };
}
  `;
}
