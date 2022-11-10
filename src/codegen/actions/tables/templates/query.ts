import {GraphQLObjectType} from 'graphql';

import {extractTtlInfo} from '../../../common/fields';
import {
  getArgFieldTypeValues,
  getOptionalArgStringValue,
  getDirective,
  getTypeScriptTypeForField,
  hasDirective,
  unmarshalField,
} from '../../../common/helpers';
import {extractKeyInfo, makeKeyTemplate} from '../../../common/keys';

import {ensureTableTemplate} from './ensure-table';

export interface QueryTplInput {
  type: GraphQLObjectType;
}

/** template */
export function queryTpl({type}: QueryTplInput) {
  const keyInfo = extractKeyInfo(type);
  const ttlInfo = extractTtlInfo(type);

  const consistent = hasDirective('consistent', type);

  const unmarshall: string[] = [];

  const fields = type.getFields();
  const fieldNames = Object.keys(fields).sort();

  for (const fieldName of fieldNames) {
    const field = fields[fieldName];

    if (keyInfo.fields.has(fieldName)) {
      // intentionally empty. if key fields need to do anything, they'll be
      // handled after the loop
    } else if (fieldName === 'version') {
      unmarshall.push(unmarshalField(field, '_v'));
    } else if (fieldName === ttlInfo?.fieldName) {
      unmarshall.push(unmarshalField(field, 'ttl'));
    } else if (fieldName === 'createdAt') {
      unmarshall.push(unmarshalField(field, '_ct'));
    } else if (fieldName === 'updatedAt') {
      unmarshall.push(unmarshalField(field, '_md'));
    } else {
      unmarshall.push(unmarshalField(field));
    }
  }

  unmarshall.push(...keyInfo.unmarshall);

  unmarshall.sort();

  const typeName = type.name;

  const directive = getDirective('compositeKey', type);

  const pkFields = getArgFieldTypeValues('pkFields', type, directive);
  const skFields = getArgFieldTypeValues('skFields', type, directive);
  const pkPrefix = getOptionalArgStringValue('pkPrefix', directive);
  const skPrefix = getOptionalArgStringValue('skPrefix', directive);

  const inputTypeName = `Query${typeName}Input`;
  const outputTypeName = `Query${typeName}Output`;

  return `
export type ${inputTypeName} =
${[undefined, ...skFields]
  .map(
    (_, index) => `
{
${pkFields
  .map((f) => `  ${f.name}: ${getTypeScriptTypeForField(f)};`)
  .join('\n')}
${skFields
  .slice(0, index)
  .map(
    (f, __, all) =>
      `  ${f.name}${
        index === all.length ? '?' : ''
      }: ${getTypeScriptTypeForField(f)};`
  )
  .join('\n')}
}`
  )
  .join('|')}



export type ${outputTypeName} = MultiResultType<${typeName}>

/** query${typeName} */
export async function query${typeName}(input: Readonly<Query${typeName}Input>): Promise<Readonly<${outputTypeName}>> {
  ${ensureTableTemplate(type)}

  const pk = \`${makeKeyTemplate(pkPrefix, pkFields)}\`;
  const sk = ['${skPrefix}', ${skFields.map(
    (f) => `'${f.name}' in input && input.${f.name}`
  )}].filter(Boolean).join('#');

  const {ConsumedCapacity: capacity, Items: items = []} = await ddbDocClient.send(new QueryCommand({
    ConsistentRead: ${consistent},
    ExpressionAttributeNames: {
      '#pk': 'pk',
      '#sk': 'sk',
    },
    ExpressionAttributeValues: {
      ':pk': pk,
      ':sk': sk,
    },
    KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  }));

  assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

  return {
    capacity,
    items: items.map((item) => {
        assert(item._et === '${typeName}', () => new DataIntegrityError(\`Expected \${JSON.stringify({${keyInfo.inputToPrimaryKey
    .map((item) => `        ${item},`)
    .join(
      '\n'
    )}})} to load items of type ${typeName} but got at \${item._et} instead\`));
      return {
${unmarshall.map((item) => `            ${item},`).join('\n')}
      };
    })
  };
}
  `;
}
