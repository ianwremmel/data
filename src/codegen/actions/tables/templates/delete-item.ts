import {GraphQLObjectType} from 'graphql';

import {ensureTableTemplate} from './ensure-table';

export interface DeleteItemTplInput {
  readonly objType: GraphQLObjectType;
}

/** template */
export function deleteItemTpl({objType}: DeleteItemTplInput) {
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
