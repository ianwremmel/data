import type {TTLConfig} from '../../../parser';

import {ensureTableTemplate} from './ensure-table';
import {objectToString} from './helpers';

export interface CreateItemTplInput {
  readonly hasPublicId: boolean;
  readonly key: Record<string, string>;
  readonly tableName: string;
  readonly ttlConfig: TTLConfig | undefined;
  readonly typeName: string;
}

/** template */
export function createItemTpl({
  hasPublicId,
  ttlConfig,
  key,
  tableName,
  typeName,
}: CreateItemTplInput) {
  const inputTypeName = `Create${typeName}Input`;
  const omitInputFields = [
    'createdAt',
    'id',
    'updatedAt',
    'version',
    hasPublicId && 'publicId',
    ttlConfig?.fieldName,
  ]
    .filter(Boolean)
    .map((f) => `'${f}'`)
    .sort();
  const outputTypeName = `Create${typeName}Output`;

  return `
export type ${inputTypeName} = Omit<${typeName}, ${omitInputFields.join('|')}>${
    ttlConfig ? ` & Partial<Pick<${typeName}, '${ttlConfig.fieldName}'>>` : ''
  };
export type ${outputTypeName} = ResultType<${typeName}>
/**  */
export async function create${typeName}(input: Readonly<Create${typeName}Input>): Promise<Readonly<${outputTypeName}>> {
${ensureTableTemplate(tableName)}

  const now = new Date();

  const {ExpressionAttributeNames, ExpressionAttributeValues, UpdateExpression} = marshall${typeName}(input, now);

  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const commandInput: UpdateCommandInput = {
    ConditionExpression: 'attribute_not_exists(#pk)',
    ExpressionAttributeNames: {
      ...ExpressionAttributeNames,
      '#createdAt': '_ct',
      ${hasPublicId ? "'#publicId': 'publicId'," : ''}
    },
    ExpressionAttributeValues: {
      ...ExpressionAttributeValues,
      ':createdAt': now.getTime(),
      ${hasPublicId ? "':publicId': idGenerator()," : ''}
    },
    Key: ${objectToString(key)},
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'ALL_NEW',
    TableName: tableName,
    UpdateExpression: UpdateExpression + ', #createdAt = :createdAt${
      hasPublicId ? ', #publicId = :publicId' : ''
    }',
  };

  const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics, Attributes: item} = await ddbDocClient.send(new UpdateCommand(commandInput));

  assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

  assert(item, 'Expected DynamoDB ot return an Attributes prop.');
  assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected to write ${typeName} but wrote \${item?._et} instead\`));

  return {
    capacity,
    item: unmarshall${typeName}(item),
    metrics,
  }
}`;
}
