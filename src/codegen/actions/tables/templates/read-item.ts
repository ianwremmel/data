import {GraphQLObjectType} from 'graphql';

import {ensureTableTemplate} from './ensure-table';

export interface ReadItemTplInput {
  readonly consistent: boolean;
  readonly objType: GraphQLObjectType;
  readonly unmarshall: readonly string[];
}

/** template */
export function readItemTpl({
  consistent,
  objType,
  unmarshall,
}: ReadItemTplInput) {
  const typeName = objType.name;

  const inputTypeName = `Read${typeName}Input`;
  const outputTypeName = `Read${typeName}Output`;

  return `
export type ${inputTypeName} = Scalars['ID'];
export type ${outputTypeName} = ResultType<${typeName}>;

/**  */
export async function read${typeName}(id: ${inputTypeName}): Promise<Readonly<${outputTypeName}>> {
${ensureTableTemplate(objType)}

  const {$metadata, ConsumedCapacity: capacity, ItemCollectionMetrics: metrics, ...data} = await ddbDocClient.send(new GetCommand({
    ConsistentRead: ${consistent},
    Key: {
      id,
    },
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  }));

  assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

  assert(data.Item, () => new NotFoundError('${typeName}', id));
  assert(data.Item?._et === '${typeName}', () => new DataIntegrityError(\`Expected \${id} to load a ${typeName} but loaded \${data.Item._et} instead\`));

  return {
    capacity,
    item: {
${unmarshall.map((item) => `      ${item},`).join('\n')}
    },
    metrics: undefined,
  }
}`;
}
