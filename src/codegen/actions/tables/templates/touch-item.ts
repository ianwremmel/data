import {GraphQLObjectType} from 'graphql';

import {ensureTableTemplate} from './ensure-table';

export interface TouchItemTplInput {
  readonly ean: readonly string[];
  readonly eav: readonly string[];
  readonly objType: GraphQLObjectType;
  readonly updateExpressions: readonly string[];
}

/** template */
export function touchItemTpl({
  ean,
  eav,
  objType,
  updateExpressions,
}: TouchItemTplInput) {
  // Note that if we want this to return the updated item, we'll 1. want do run
  // in a transaction (if possible) and 2. use  a consistent read (even
  // @consistent hasn't been applied to this Model).
  return `
/**  */
export async function touch${objType.name}(id: Scalars['ID']): Promise<void> {
${ensureTableTemplate(objType)}
  try {
    await ddbDocClient.send(new UpdateCommand({
      ConditionExpression: 'attribute_exists(#id)',
      ExpressionAttributeNames: {
  ${ean.map((e) => `        ${e},`).join('\n')}
      },
      ExpressionAttributeValues: {
  ${eav.map((e) => `        ${e},`).join('\n')}
      },
      Key: {
        id,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: 'SET ${updateExpressions.join(', ')}',
    }));
  }
  catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new NotFoundError('${objType.name}', id);
    }
    throw err;
  }
}`;
}
