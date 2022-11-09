import {GraphQLObjectType} from 'graphql';

import {Nullable} from '../../../../types';
import {TtlInfo} from '../../../common/fields';
import {KeyInfo} from '../../../common/keys';

import {ensureTableTemplate} from './ensure-table';

export interface CreateItemTplInput {
  readonly objType: GraphQLObjectType;
  readonly ttlInfo: Nullable<TtlInfo>;
  readonly ean: readonly string[];
  readonly eav: readonly string[];
  readonly key: readonly string[];
  readonly keyInfo: KeyInfo;
  readonly unmarshall: readonly string[];
  readonly updateExpressions: readonly string[];
}
/** template */
export function createItemTpl({
  objType,
  ttlInfo,
  ean,
  eav,
  key,
  keyInfo,
  unmarshall,
  updateExpressions,
}: CreateItemTplInput) {
  const typeName = objType.name;

  const inputTypeName = `Create${typeName}Input`;
  const omitInputFields = [
    'createdAt',
    'updatedAt',
    ...keyInfo.omitForCreate,
    ...(ttlInfo ? [ttlInfo.fieldName] : []),
    'version',
  ]
    .map((f) => `'${f}'`)
    .sort();
  const outputTypeName = `Create${typeName}Output`;

  return `
export type ${inputTypeName} = Omit<${typeName}, ${omitInputFields.join('|')}>;
export type ${outputTypeName} = ResultType<${typeName}>
/**  */
export async function create${typeName}(input: Readonly<Create${typeName}Input>): Promise<Readonly<${outputTypeName}>> {
  const now = new Date();
${ensureTableTemplate(objType)}

  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics, Attributes: item} = await ddbDocClient.send(new UpdateCommand({
      ConditionExpression: 'attribute_not_exists(#id)',
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
  assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected to write ${typeName} but wrote \${item?._et} instead\`));

  return {
    capacity,
    item: {
${unmarshall.map((item) => `        ${item},`).join('\n')}
    },
    metrics,
  }
}`;
}
