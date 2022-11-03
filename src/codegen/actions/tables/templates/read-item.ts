import {GraphQLObjectType} from 'graphql';

import {ensureTableTemplate} from './ensure-table';

export interface ReadItemTplInput {
  consistent: boolean;
  objType: GraphQLObjectType;
  unmarshall: string[];
}

/** template */
export function readItemTpl({
  consistent,
  objType,
  unmarshall,
}: ReadItemTplInput) {
  return `
/**  */
export async function read${objType.name}(id: string) {
${ensureTableTemplate(objType)}

  const {$metadata, ...data} = await ddbDocClient.send(new GetCommand({
    ConsistentRead: ${consistent},
    Key: {
      id,
    },
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  }));

  if (!data.Item) {
    throw new Error(\`No ${objType.name} found with id \${id}\`);
  }

  return {
${unmarshall.map((item) => `    ${item},`).join('\n')}
  }
}`;
}
