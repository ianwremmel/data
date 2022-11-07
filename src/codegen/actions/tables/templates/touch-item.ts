import {GraphQLObjectType} from 'graphql';

import {ensureTableTemplate} from './ensure-table';

export interface TouchItemTplInput {
  readonly ean: readonly string[];
  readonly eav: readonly string[];
  readonly key: readonly string[];
  readonly objType: GraphQLObjectType;
  readonly updateExpressions: readonly string[];
}

/** template */
export function touchItemTpl({
  ean,
  eav,
  key,
  objType,
  updateExpressions,
}: TouchItemTplInput) {
  const typeName = objType.name;

  const outputTypeName = `Touch${typeName}Output`;
  const primaryKeyType = `${objType.name}PrimaryKey`;

  // Note that if we want this to return the updated item, we'll 1. want to run
  // in a transaction (if possible) and 2. use  a consistent read (even
  // @consistent hasn't been applied to this Model).
  return `
export type ${outputTypeName} = ResultType<void>;

/**  */
export async function touch${typeName}(input: ${primaryKeyType}): Promise<${outputTypeName}> {
${ensureTableTemplate(objType)}
  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} = await ddbDocClient.send(new UpdateCommand({
      ConditionExpression: 'attribute_exists(#id)',
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
}`;
}
