import {GraphQLObjectType} from 'graphql';

import {ensureTableTemplate} from './ensure-table';

export interface DeleteItemTplInput {
  readonly objType: GraphQLObjectType;
}

/** template */
export function deleteItemTpl({objType}: DeleteItemTplInput) {
  const typeName = objType.name;

  const inputTypeName = `Delete${typeName}Input`;
  const outputTypeName = `Delete${typeName}Output`;

  return `
export type ${inputTypeName} = Scalars['ID'];
export type ${outputTypeName} = ResultType<void>;

/**  */
export async function delete${typeName}(id: ${inputTypeName}): Promise<${outputTypeName}> {
${ensureTableTemplate(objType)}

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} = await ddbDocClient.send(new DeleteCommand({
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

    assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

    return {
      capacity,
      item: undefined,
      metrics,
    }
  }
  catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new NotFoundError('${typeName}', id);
    }
    throw err;
  }
}
`;
}
