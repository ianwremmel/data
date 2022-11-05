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
export type ${outputTypeName} = void;

/**  */
export async function delete${typeName}(id: ${inputTypeName}): Promise<${outputTypeName}> {
${ensureTableTemplate(objType)}

  try {
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
  catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new NotFoundError('${typeName}', id);
    }
    throw err;
  }
}
`;
}
