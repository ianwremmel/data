import type {TTLConfig} from '../../../parser';

import {ensureTableTemplate} from './ensure-table';
import {objectToString} from './helpers';

export interface UpdateItemTplInput {
  readonly key: Record<string, string>;
  readonly marshallPrimaryKey: string;
  readonly tableName: string;
  readonly ttlConfig: TTLConfig | undefined;
  readonly typeName: string;
}

/** template */
export function updateItemTpl({
  marshallPrimaryKey,
  key,
  tableName,
  ttlConfig,
  typeName,
}: UpdateItemTplInput) {
  const inputTypeName = `Update${typeName}Input`;
  const omitInputFields = [
    'id',
    'createdAt',
    'updatedAt',
    ...(ttlConfig ? [ttlConfig.fieldName] : []),
  ]
    .map((f) => `'${f}'`)
    .sort();
  const outputTypeName = `Update${typeName}Output`;

  return `
export type ${inputTypeName} = Omit<${typeName}, ${omitInputFields.join(
    '|'
  )}> ${ttlConfig ? ` & {${ttlConfig.fieldName}?: Date}` : ''};
export type ${outputTypeName} = ResultType<${typeName}>

/**  */
export async function update${typeName}(input: Readonly<${inputTypeName}>): Promise<Readonly<${outputTypeName}>> {
${ensureTableTemplate(tableName)}
  const {ExpressionAttributeNames, ExpressionAttributeValues, UpdateExpression} = marshall${typeName}(input);
  try {
    const {Attributes: item, ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} = await ddbDocClient.send(new UpdateCommand({
      ConditionExpression: '#version = :previousVersion AND #entity = :entity AND attribute_exists(#pk)',
      ExpressionAttributeNames,
      ExpressionAttributeValues: {
        ...ExpressionAttributeValues,
        ':previousVersion': input.version,
      },
      Key: ${objectToString(key)},
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression,
    }));

    assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

    assert(item, 'Expected DynamoDB ot return an Attributes prop.');
    assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected \${JSON.stringify(${marshallPrimaryKey})} to update a ${typeName} but updated \${item._et} instead\`));

    return {
      capacity,
      item: unmarshall${typeName}(item),
      metrics,
    }
  }
  catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        await read${typeName}(input);
      }
      catch {
        throw new NotFoundError('${typeName}', ${marshallPrimaryKey});
      }
      throw new OptimisticLockingError('${typeName}', ${marshallPrimaryKey});
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}`;
}
