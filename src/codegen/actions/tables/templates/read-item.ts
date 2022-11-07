import {GraphQLObjectType} from 'graphql';

import {ensureTableTemplate} from './ensure-table';

export interface ReadItemTplInput {
  readonly consistent: boolean;
  readonly key: readonly string[];
  readonly objType: GraphQLObjectType;
  readonly unmarshall: readonly string[];
}

/** template */
export function readItemTpl({
  consistent,
  key,
  objType,
  unmarshall,
}: ReadItemTplInput) {
  const typeName = objType.name;

  const outputTypeName = `Read${typeName}Output`;
  const primaryKeyType = `${objType.name}PrimaryKey`;

  return `
export type ${outputTypeName} = ResultType<${typeName}>;

/**  */
export async function read${typeName}(input: ${primaryKeyType}): Promise<Readonly<${outputTypeName}>> {
${ensureTableTemplate(objType)}

  const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(new GetCommand({
    ConsistentRead: ${consistent},
      Key: {
${key.map((k) => `        ${k},`).join('\n')}
      },
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  }));

  assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

  assert(item, () => new NotFoundError('${typeName}', input));
  assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected \${JSON.stringify(input)} to load a ${typeName} but loaded \${item._et} instead\`));

  return {
    capacity,
    item: {
${unmarshall.map((item) => `      ${item},`).join('\n')}
    },
    metrics: undefined,
  }
}`;
}
