import {GraphQLObjectType} from 'graphql';

import {ensureTableTemplate} from './ensure-table';

export interface DeleteItemTplInputp {
  objType: GraphQLObjectType;
}

/** template */
export function deleteItemTpl({objType}: DeleteItemTplInputp) {
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
