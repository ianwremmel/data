import {GraphQLObjectType} from 'graphql';

import {Nullable} from '../../../../types';
import {TtlInfo} from '../../../common/fields';

import {ensureTableTemplate} from './ensure-table';

export interface UpdateItemTplInput {
  readonly objType: GraphQLObjectType;
  readonly ttlInfo: Nullable<TtlInfo>;
  readonly ean: readonly string[];
  readonly eav: readonly string[];
  readonly unmarshall: readonly string[];
  readonly updateExpressions: readonly string[];
}

/** template */
export function updateItemTpl({
  objType,
  ttlInfo,
  ean,
  eav,
  unmarshall,
  updateExpressions,
}: UpdateItemTplInput) {
  return `
export type Update${objType.name}Input = Omit<${
    objType.name
  }, 'createdAt'|'updatedAt'${ttlInfo ? `|'${ttlInfo.fieldName}'` : ''}>;

/**  */
export async function update${objType.name}(input: Readonly<Update${
    objType.name
  }Input>): Promise<Readonly<${objType.name}>> {
  const now = new Date();
${ensureTableTemplate(objType)}
  const data = await ddbDocClient.send(new UpdateCommand({
    ConditionExpression: '#version = :version AND attribute_exists(#id)',
    ExpressionAttributeNames: {
${ean.map((e) => `        ${e},`).join('\n')}
    },
    ExpressionAttributeValues: {
${eav.map((e) => `        ${e},`).join('\n')}
    },
    Key: {
      id: input.id,
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
