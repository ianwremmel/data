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
  return `
/**  */
export async function read${objType.name}(id: string): Promise<Readonly<${
    objType.name
  }>> {
${ensureTableTemplate(objType)}

  const {$metadata, ...data} = await ddbDocClient.send(new GetCommand({
    ConsistentRead: ${consistent},
    Key: {
      id,
    },
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  }));

  assert(data.Item, () => new NotFoundError('${objType.name}', id));

  return {
${unmarshall.map((item) => `    ${item},`).join('\n')}
  }
}`;
}
