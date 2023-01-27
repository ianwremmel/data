import {filterNull} from '../../../common/filters';
import type {Field, TTLConfig, Model} from '../../../parser';
import {defineComputedInputFields, inputName} from '../computed-fields';

import {ensureTableTemplate} from './ensure-table';
import {objectToString} from './helpers';

export interface UpdateItemTplInput {
  readonly fields: readonly Field[];
  readonly hasPublicId: boolean;
  readonly key: Record<string, string>;
  readonly marshallPrimaryKey: string;
  readonly model: Model;
  readonly primaryKeyFields: string[];
  readonly tableName: string;
  readonly ttlConfig: TTLConfig | undefined;
  readonly typeName: string;
}

/** template */
export function updateItemTpl({
  fields,
  hasPublicId,
  key,
  marshallPrimaryKey,
  model,
  primaryKeyFields,
  tableName,
  ttlConfig,
  typeName,
}: UpdateItemTplInput) {
  const inputTypeName = `Update${typeName}Input`;
  const omitInputFields = [
    'id',
    'createdAt',
    'updatedAt',
    hasPublicId && 'publicId',
    ttlConfig?.fieldName,
    ...fields
      .filter(({computeFunction}) => !!computeFunction)
      .map(({fieldName}) => fieldName),
  ]
    .filter(filterNull)
    .filter((fieldName) => !primaryKeyFields.includes(fieldName as string))
    .map((f) => `'${f}'`)
    .sort();
  const outputTypeName = `Update${typeName}Output`;

  return `
export type ${inputTypeName} = Omit<${typeName}, ${omitInputFields.join(
    '|'
  )}> ${
    ttlConfig ? ` & Partial<Pick<${typeName}, '${ttlConfig.fieldName}'>>` : ''
  };
export type ${outputTypeName} = ResultType<${typeName}>

/**  */
export async function update${typeName}(${inputName(
    model
  )}: Readonly<${inputTypeName}>): Promise<Readonly<${outputTypeName}>> {
${ensureTableTemplate(tableName)}
  ${defineComputedInputFields(fields, typeName)}
  const {ExpressionAttributeNames, ExpressionAttributeValues, UpdateExpression} = marshall${typeName}(input);
  try {
    let previousVersionCE = '';
    let previousVersionEAV = {};
    if ('version' in input && typeof input.version !== 'undefined') {
      previousVersionCE = '#version = :previousVersion AND ';
      previousVersionEAV = {':previousVersion': input.version,}
    }
    const commandInput: UpdateCommandInput = {
      ConditionExpression: \`\${previousVersionCE}#entity = :entity AND attribute_exists(#pk)\`,
      ExpressionAttributeNames,
      ExpressionAttributeValues: {
        ...ExpressionAttributeValues,
        ...previousVersionEAV
      },
      Key: ${objectToString(key)},
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression,
    };

    const {Attributes: item, ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} = await ddbDocClient.send(new UpdateCommand(commandInput));

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
