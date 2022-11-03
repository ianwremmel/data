import {GraphQLObjectType} from 'graphql';

import {Nullable} from '../../../../types';
import {TtlInfo} from '../../../common/fields';

import {ensureTableTemplate} from './ensure-table';

export interface CreateItemTplInput {
  objType: GraphQLObjectType;
  ttlInfo: Nullable<TtlInfo>;
  ean: string[];
  eav: string[];
  unmarshall: string[];
  updateExpressions: string[];
}
/** template */
export function createItemTpl({
  objType,
  ttlInfo,
  ean,
  eav,
  unmarshall,
  updateExpressions,
}: CreateItemTplInput) {
  return `
export type Create${objType.name}Input = Omit<${
    objType.name
  }, 'createdAt'|'id'|'updatedAt'${
    ttlInfo ? `|'${ttlInfo.fieldName}'` : ''
  }|'version'>;

/**  */
export async function create${objType.name}(input: Create${
    objType.name
  }Input): Promise<${objType.name}> {
  const now = new Date();
${ensureTableTemplate(objType)}

  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const data = await ddbDocClient.send(new UpdateCommand({
      ConditionExpression: 'attribute_not_exists(#id)',
      ExpressionAttributeNames: {
${ean.map((e) => `        ${e},`).join('\n')}
      },
      ExpressionAttributeValues: {
${eav.map((e) => `        ${e},`).join('\n')}
      },
      Key: {
        id: \`${objType.name}#\${uuidv4()}\`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: 'SET ${updateExpressions.join(', ')}',
  }));
  return {
${unmarshall.map((item) => `    ${item},`).join('\n')}
  };
}`;
}
