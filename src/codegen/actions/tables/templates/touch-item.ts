import {ensureTableTemplate} from './ensure-table';
import {objectToString} from './helpers';

export interface TouchItemTplInput {
  readonly ean: readonly string[];
  readonly eav: readonly string[];
  readonly key: Record<string, string>;
  readonly tableName: string;
  readonly typeName: string;
  readonly updateExpressions: readonly string[];
}

/** template */
export function touchItemTpl({
  ean,
  eav,
  key,
  tableName,
  typeName,
  updateExpressions,
}: TouchItemTplInput) {
  const outputTypeName = `Touch${typeName}Output`;
  const primaryKeyType = `${typeName}PrimaryKey`;

  // Note that if we want this to return the updated item, we'll 1. want to run
  // in a transaction (if possible) and 2. use  a consistent read (even
  // @consistent hasn't been applied to this Model).
  return `
export type ${outputTypeName} = ResultType<void>;

/**  */
export async function touch${typeName}(input: ${primaryKeyType}): Promise<${outputTypeName}> {
${ensureTableTemplate(tableName)}
  try {
    const commandInput: UpdateCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
${ean.map((e) => `        ${e},`).join('\n')}
      },
      ExpressionAttributeValues: {
${eav.map((e) => `        ${e},`).join('\n')}
      },
      Key: ${objectToString(key)},
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: 'SET ${updateExpressions.join(', ')}',
    };

    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} = await ddbDocClient.send(new UpdateCommand(commandInput));

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
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}`;
}
