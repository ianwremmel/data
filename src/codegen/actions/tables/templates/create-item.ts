import {GraphQLObjectType} from 'graphql';

import {ensureTableTemplate} from './ensure-table';

export interface CreateItemTplInput {
  readonly conditionField: string;
  readonly key: readonly string[];
  readonly objType: GraphQLObjectType;
  readonly omit: readonly string[];
}

/** template */
export function createItemTpl({
  conditionField,
  key,
  objType,
  omit,
}: CreateItemTplInput) {
  const typeName = objType.name;

  const inputTypeName = `Create${typeName}Input`;
  const omitInputFields = ['createdAt', 'updatedAt', 'version', ...omit]
    .map((f) => `'${f}'`)
    .sort();
  const outputTypeName = `Create${typeName}Output`;

  return `
export type ${inputTypeName} = Omit<${typeName}, ${omitInputFields.join('|')}>;
export type ${outputTypeName} = ResultType<${typeName}>
/**  */
export async function create${typeName}(input: Readonly<Create${typeName}Input>): Promise<Readonly<${outputTypeName}>> {
${ensureTableTemplate(objType)}
  const {ExpressionAttributeNames, ExpressionAttributeValues, UpdateExpression} = marshall${
    objType.name
  }(input);
  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics, Attributes: item} = await ddbDocClient.send(new UpdateCommand({
      ConditionExpression: 'attribute_not_exists(#${conditionField})',
      ExpressionAttributeNames,
      ExpressionAttributeValues,
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
  assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected to write ${typeName} but wrote \${item?._et} instead\`));

  return {
    capacity,
    item: unmarshall${objType.name}(item),
    metrics,
  }
}`;
}
