import {GraphQLObjectType} from 'graphql';

import {Nullable} from '../../../../types';
import {TtlInfo} from '../../../common/fields';

import {ensureTableTemplate} from './ensure-table';

export interface CreateItemTplInput {
  readonly objType: GraphQLObjectType;
  readonly ttlInfo: Nullable<TtlInfo>;
  readonly ean: readonly string[];
  readonly eav: readonly string[];
  readonly unmarshall: readonly string[];
  readonly updateExpressions: readonly string[];
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
export async function create${objType.name}(input: Readonly<Create${
    objType.name
  }Input>): Promise<Readonly<${objType.name}>> {
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

  assert(data.Attributes?._et === '${
    objType.name
  }', () => new DataIntegrityError(\`Expected write ${
    objType.name
  } but wrote \${data.Attributes._et} instead\`));

  return {
${unmarshall.map((item) => `    ${item},`).join('\n')}
  };
}`;
}
