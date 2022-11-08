import {GraphQLObjectType} from 'graphql';

import {Nullable} from '../../../../types';
import {TtlInfo} from '../../../common/fields';

import {ensureTableTemplate} from './ensure-table';

export interface UpdateItemTplInput {
  readonly objType: GraphQLObjectType;
  readonly ttlInfo: Nullable<TtlInfo>;
  readonly ean: readonly string[];
  readonly eav: readonly string[];
  readonly key: readonly string[];
  readonly inputToPrimaryKey: readonly string[];
  readonly unmarshall: readonly string[];
  readonly updateExpressions: readonly string[];
}

/** template */
export function updateItemTpl({
  objType,
  ttlInfo,
  ean,
  eav,
  inputToPrimaryKey,
  key,
  unmarshall,
  updateExpressions,
}: UpdateItemTplInput) {
  const typeName = objType.name;

  const inputTypeName = `Update${typeName}Input`;
  const omitInputFields = [
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
  const now = new Date();
${ensureTableTemplate(objType)}
  try {
    const {Attributes: item, ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} = await ddbDocClient.send(new UpdateCommand({
      ConditionExpression: '#version = :version AND attribute_exists(#id)',
      ExpressionAttributeNames: {
${ean.map((e) => `        ${e},`).join('\n')}
      },
      ExpressionAttributeValues: {
${eav.map((e) => `        ${e},`).join('\n')}
      },
      Key: {
${key.map((k) => `        ${k},`).join('\n')}
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: 'SET ${updateExpressions.join(', ')}',
    }));

    assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

    assert(item, 'Expected DynamoDB ot return an Attributes prop.');
    assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected \${input.id} to update a ${typeName} but updated \${item._et} instead\`));

    return {
      capacity,
      item: {
${unmarshall.map((item) => `        ${item},`).join('\n')}
      },
      metrics,
    }
  }
  catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        const readResult = await read${typeName}(input);
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
