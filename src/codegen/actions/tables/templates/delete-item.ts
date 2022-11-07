import {GraphQLObjectType} from 'graphql';

import {ensureTableTemplate} from './ensure-table';

export interface DeleteItemTplInput {
  readonly ean: readonly string[];
  readonly key: readonly string[];
  readonly objType: GraphQLObjectType;
}

/** template */
export function deleteItemTpl({ean, key, objType}: DeleteItemTplInput) {
  const typeName = objType.name;

  const inputTypeName = `Delete${typeName}Input`;
  const outputTypeName = `Delete${typeName}Output`;
  const primaryKeyType = `${objType.name}PrimaryKey`;

  return `
export type ${inputTypeName} = Scalars['ID'];
export type ${outputTypeName} = ResultType<void>;

/**  */
export async function delete${typeName}(primaryKey: ${primaryKeyType}): Promise<${outputTypeName}> {
${ensureTableTemplate(objType)}

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} = await ddbDocClient.send(new DeleteCommand({
      ConditionExpression: 'attribute_exists(#id)',
      ExpressionAttributeNames: {
${ean.map((e) => `        ${e},`).join('\n')}
      },
      Key: {
${key.map((k) => `        ${k},`).join('\n')}
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
      throw new NotFoundError('${typeName}', primaryKey);
    }
    throw err;
  }
}
`;
}
