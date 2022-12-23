import type {TTLConfig} from '../../../parser';

import {ensureTableTemplate} from './ensure-table';
import {objectToString} from './helpers';

export interface BlindWriteTplInput {
  readonly key: Record<string, string>;
  readonly tableName: string;
  readonly ttlConfig: TTLConfig | undefined;
  readonly typeName: string;
}

/** template */
export function blindWriteTpl({
  key,
  tableName,
  ttlConfig,
  typeName,
}: BlindWriteTplInput) {
  const inputTypeName = `BlindWrite${typeName}Input`;
  const omitInputFields = [
    'id',
    'createdAt',
    'updatedAt',
    'version',
    ...(ttlConfig ? [ttlConfig.fieldName] : []),
  ]
    .map((f) => `'${f}'`)
    .sort();
  const outputTypeName = `BlindWrite${typeName}Output`;

  return `
export type ${inputTypeName} = Omit<${typeName}, ${omitInputFields.join(
    '|'
  )}> ${
    ttlConfig ? ` & Partial<Pick<${typeName}, '${ttlConfig.fieldName}'>>` : ''
  };
export type ${outputTypeName} = ResultType<${typeName}>;
/** */
export async function blindWrite${typeName}(input: Readonly<${inputTypeName}>): Promise<Readonly<${outputTypeName}>> {
${ensureTableTemplate(tableName)}
  const {ExpressionAttributeNames, ExpressionAttributeValues, UpdateExpression} = marshall${typeName}(input);

  delete ExpressionAttributeNames['#pk'];
  delete ExpressionAttributeValues[':version'];

  const eav = {...ExpressionAttributeValues, ':one': 1};
  const ue = UpdateExpression
    .split(', ')
    .filter((e) => !e.startsWith('#version'))
    .join(', ') + ' ADD #version :one'

  const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics, Attributes: item} = await ddbDocClient.send(new UpdateCommand({
    ExpressionAttributeNames,
    ExpressionAttributeValues: eav,
    Key: ${objectToString(key)},
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'ALL_NEW',
    TableName: tableName,
    UpdateExpression: ue,
  }));

  assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

  assert(item, 'Expected DynamoDB ot return an Attributes prop.');
  assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected to write ${typeName} but wrote \${item?._et} instead\`));

  return {
    capacity,
    item: unmarshall${typeName}(item),
    metrics,
  }
}
`;
}
