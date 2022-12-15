import type {TTLConfig} from '../../../parser';

import {ensureTableTemplate} from './ensure-table';

export interface UpdateItemTplInput {
  readonly key: Record<string, string>;
  readonly inputToPrimaryKey: readonly string[];
  readonly tableName: string;
  readonly ttlInfo: TTLConfig | undefined;
  readonly typeName: string;
}

/** template */
export function updateItemTpl({
  inputToPrimaryKey,
  key,
  tableName,
  ttlInfo,
  typeName,
}: UpdateItemTplInput) {
  const inputTypeName = `Update${typeName}Input`;
  const omitInputFields = [
    'id',
    'createdAt',
    'updatedAt',
    ...(ttlInfo ? [ttlInfo.fieldName] : []),
  ]
    .map((f) => `'${f}'`)
    .sort();
  const outputTypeName = `Update${typeName}Output`;

  return `
export type ${inputTypeName} = Omit<${typeName}, ${omitInputFields.join('|')}>;
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
      Key: {
${Object.entries(key).map(([k, value]) => `${k}: \`${value}\``)}
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression,
    }));

    assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

    assert(item, 'Expected DynamoDB ot return an Attributes prop.');
    assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected \${JSON.stringify({${inputToPrimaryKey
    .map((item) => `        ${item},`)
    .join(
      '\n'
    )}})} to update a ${typeName} but updated \${item._et} instead\`));

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
        throw new NotFoundError('${typeName}', {
${inputToPrimaryKey.map((item) => `        ${item},`).join('\n')}
        });
      }
      throw new OptimisticLockingError('${typeName}', {
${inputToPrimaryKey.map((item) => `      ${item},`).join('\n')}
      });
    }
    throw err;
  }
}`;
}
