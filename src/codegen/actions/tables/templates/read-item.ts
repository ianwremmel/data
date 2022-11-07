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

  const inputTypeName = `Read${typeName}Input`;
  const outputTypeName = `Read${typeName}Output`;
  const primaryKeyType = `${objType.name}PrimaryKey`;

  return `
export type ${inputTypeName} = Scalars['ID'];
export type ${outputTypeName} = ResultType<${typeName}>;

/**  */
export async function read${typeName}(primaryKey: ${primaryKeyType}): Promise<Readonly<${outputTypeName}>> {
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

  assert(item, () => new NotFoundError('${typeName}', primaryKey));
  assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected \${JSON.stringify(primaryKey)} to load a ${typeName} but loaded \${item._et} instead\`));

  return {
    capacity,
    item: {
${unmarshall.map((item) => `      ${item},`).join('\n')}
    },
    metrics: undefined,
  }
}`;
}
