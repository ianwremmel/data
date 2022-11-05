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
  const typeName = objType.name;

  const inputTypeName = `Create${typeName}Input`;
  const omitInputFields = [
    'createdAt',
    'id',
    'updatedAt',
    ...(ttlInfo ? [ttlInfo.fieldName] : []),
    'version',
  ].map((f) => `'${f}'`);
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
  const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics, ...data} = await ddbDocClient.send(new UpdateCommand({
      ConditionExpression: 'attribute_not_exists(#id)',
      ExpressionAttributeNames: {
${ean.map((e) => `        ${e},`).join('\n')}
      },
      ExpressionAttributeValues: {
${eav.map((e) => `        ${e},`).join('\n')}
      },
      Key: {
        id: \`${typeName}#\${uuidv4()}\`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: 'SET ${updateExpressions.join(', ')}',
  }));

  assert(data.Attributes?._et === '${typeName}', () => new DataIntegrityError(\`Expected write ${typeName} but wrote \${data.Attributes._et} instead\`));

  return {
    capacity,
    item: {
${unmarshall.map((item) => `        ${item},`).join('\n')}
    },
    metrics,
  }
}`;
}
