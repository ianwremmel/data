import type {GraphQLObjectType} from 'graphql';

import type {Nullable} from '../../../../types';
import type {TtlInfo} from '../../../common/fields';

import {ensureTableTemplate} from './ensure-table';

export interface UpdateItemTplInput {
  readonly conditionField: string;
  readonly objType: GraphQLObjectType;
  readonly ttlInfo: Nullable<TtlInfo>;
  readonly key: readonly string[];
  readonly inputToPrimaryKey: readonly string[];
}

/** template */
export function updateItemTpl({
  conditionField,
  objType,
  ttlInfo,
  inputToPrimaryKey,
  key,
}: UpdateItemTplInput) {
  const typeName = objType.name;

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
${ensureTableTemplate(objType)}
  const {ExpressionAttributeNames, ExpressionAttributeValues, UpdateExpression} = marshall${
    objType.name
  }(input);
  try {
    const {Attributes: item, ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} = await ddbDocClient.send(new UpdateCommand({
      ConditionExpression: '#version = :previousVersion AND #entity = :entity AND attribute_exists(#${conditionField})',
      ExpressionAttributeNames,
      ExpressionAttributeValues: {
        ...ExpressionAttributeValues,
        ':previousVersion': input.version,
      },
      Key: {
${key.map((k) => `        ${k},`).join('\n')}
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
      item: unmarshall${objType.name}(item),
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
