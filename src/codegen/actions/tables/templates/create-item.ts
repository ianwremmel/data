import {filterNull} from '../../../common/filters';
import type {Field, Model, TTLConfig} from '../../../parser';
import {defineComputedInputFields, inputName} from '../computed-fields';

import {ensureTableTemplate} from './ensure-table';
import {objectToString} from './helpers';
import {
  indexHasField,
  indexToEANPart,
  indexToEAVPart,
  indexToUpdateExpressionPart,
} from './indexes';

export interface CreateItemTplInput {
  readonly fields: readonly Field[];
  readonly hasPublicId: boolean;
  readonly key: Record<string, string>;
  readonly model: Model;
  readonly tableName: string;
  readonly ttlConfig: TTLConfig | undefined;
  readonly typeName: string;
}

/** template */
export function createItemTpl({
  fields,
  hasPublicId,
  key,
  model,
  tableName,
  ttlConfig,
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
    ...fields
      .filter(({computeFunction}) => !!computeFunction)
      .map(({fieldName}) => fieldName),
  ]
    .filter(filterNull)
    .map((f) => `'${f}'`)
    .sort();
  const outputTypeName = `Create${typeName}Output`;

  return `
export type ${inputTypeName} = Omit<${typeName}, ${omitInputFields.join('|')}>${
    ttlConfig ? ` & Partial<Pick<${typeName}, '${ttlConfig.fieldName}'>>` : ''
  };
export type ${outputTypeName} = ResultType<${typeName}>
/**  */
export async function create${typeName}(${inputName(
    model
  )}: Readonly<Create${typeName}Input>): Promise<Readonly<${outputTypeName}>> {
${ensureTableTemplate(tableName)}

  const now = new Date();

  ${defineComputedInputFields(fields, typeName)}
  const {ExpressionAttributeNames, ExpressionAttributeValues, UpdateExpression} = marshall${typeName}(input, now);

  ${hasPublicId ? `const publicId = idGenerator();` : ''}
  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const commandInput: UpdateCommandInput = {
    ConditionExpression: 'attribute_not_exists(#pk)',
    ExpressionAttributeNames: {
      ...ExpressionAttributeNames,
      '#createdAt': '_ct',
      ${hasPublicId ? "'#publicId': 'publicId'," : ''}
          ${model.secondaryIndexes
            .filter((index) =>
              indexHasField('createdAt', model.primaryKey, index)
            )
            .map(indexToEANPart)
            .flat()
            .join('\n')}
    },
    ExpressionAttributeValues: {
      ...ExpressionAttributeValues,
      ':createdAt': now.getTime(),
      ${hasPublicId ? "':publicId': publicId," : ''}
          ${model.secondaryIndexes
            .filter((index) =>
              indexHasField('createdAt', model.primaryKey, index)
            )
            .map((index) => indexToEAVPart('create', index))
            .flat()
            .join('\n')}
    },
    Key: ${objectToString(key)},
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'ALL_NEW',
    TableName: tableName,
    UpdateExpression: [
      ...UpdateExpression.split(', '),
      '#createdAt = :createdAt',
      ${hasPublicId ? "'#publicId = :publicId'," : ''}
      ${model.secondaryIndexes
        .filter((index) => indexHasField('createdAt', model.primaryKey, index))
        .map(indexToUpdateExpressionPart)
        .flat()
        .join('\n')}
    ].join(', ')
  };

  const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics, Attributes: item} = await ddbDocClient.send(new UpdateCommand(commandInput));

  assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

  assert(item, 'Expected DynamoDB to return an Attributes prop.');
  assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected to write ${typeName} but wrote \${item?._et} instead\`));

  return {
    capacity,
    item: unmarshall${typeName}(item),
    metrics,
  }
}`;
}
