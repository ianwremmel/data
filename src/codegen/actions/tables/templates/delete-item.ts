import {ensureTableTemplate} from './ensure-table';

export interface DeleteItemTplInput {
  readonly key: Record<string, string>;
  readonly tableName: string;
  readonly typeName: string;
}

/** template */
export function deleteItemTpl({key, tableName, typeName}: DeleteItemTplInput) {
  const outputTypeName = `Delete${typeName}Output`;
  const primaryKeyType = `${typeName}PrimaryKey`;

  return `
export type ${outputTypeName} = ResultType<void>;

/**  */
export async function delete${typeName}(input: ${primaryKeyType}): Promise<${outputTypeName}> {
${ensureTableTemplate(tableName)}

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} = await ddbDocClient.send(new DeleteCommand({
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        "#pk": "pk",
      },
      Key: {
${Object.entries(key).map(([k, value]) => `${k}: \`${value}\``)}
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
      throw new NotFoundError('${typeName}', input);
    }
    throw err;
  }
}
`;
}
