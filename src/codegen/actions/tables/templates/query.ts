import type {Field, PrimaryKeyConfig, SecondaryIndex} from '../../../parser';

import {ensureTableTemplate} from './ensure-table';
import {
  getTypeScriptTypeForField,
  makeKeyTemplate,
  objectToString,
} from './helpers';

export interface QueryTplInput {
  readonly consistent: boolean;
  readonly isPublicModel: boolean;
  readonly primaryKey: PrimaryKeyConfig;
  readonly secondaryIndexes: readonly SecondaryIndex[];
  readonly tableName: string;
  readonly typeName: string;
}

/** template */
export function queryTpl({
  consistent,
  isPublicModel,
  primaryKey,
  secondaryIndexes,
  tableName,
  typeName,
}: QueryTplInput): string {
  const hasIndexes = secondaryIndexes.length > 0;

  const sortKeyFields = primaryKey.isComposite ? primaryKey.sortKeyFields : [];

  const inputTypeName = `Query${typeName}Input`;
  const outputTypeName = `Query${typeName}Output`;

  return `
export type ${inputTypeName} = ${makeTypeSignature(
    primaryKey,
    secondaryIndexes
  )};
export type ${outputTypeName} = MultiResultType<${typeName}>;

/** helper */
function makeEanForQuery${typeName}(input: ${inputTypeName}): Record<string, string> {
${eanForQuery(primaryKey, secondaryIndexes)}
}

/** helper */
function makeEavForQuery${typeName}(input: ${inputTypeName}): Record<string, any> {
${eavForQuery(primaryKey, secondaryIndexes)}
}

/** helper */
function makeKceForQuery${typeName}(input: ${inputTypeName}, {operator}: Pick<QueryOptions, 'operator'>): string {
${kceForQuery(primaryKey, secondaryIndexes)}
}

/** query${typeName} */
export async function query${typeName}(input: Readonly<Query${typeName}Input>, {limit = undefined, operator = 'begins_with', reverse = false}: QueryOptions = {}): Promise<Readonly<${outputTypeName}>> {
  ${ensureTableTemplate(tableName)}

  const ExpressionAttributeNames = makeEanForQuery${typeName}(input);
  const ExpressionAttributeValues = makeEavForQuery${typeName}(input);
  const KeyConditionExpression = makeKceForQuery${typeName}(input, {operator});

  const commandInput: QueryCommandInput = {
    ConsistentRead: ${consistent ? `!('index' in input)` : 'false'},
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    IndexName: ${
      hasIndexes ? `'index' in input ? input.index : undefined` : 'undefined'
    },
    KeyConditionExpression,
    Limit: limit,
    ReturnConsumedCapacity: 'INDEXES',
    ScanIndexForward: !reverse,
    TableName: tableName,
  };

  const {ConsumedCapacity: capacity, Items: items = []} = await ddbDocClient.send(new QueryCommand(commandInput));

  assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

  return {
    capacity,
    items: items.map((item) => {
      assert(item._et === '${typeName}', () => new DataIntegrityError('TODO'));
      return unmarshall${typeName}(item);
    })
  };
}

/** queries the ${typeName} table by primary key using a node id */
export async function query${typeName}ByNodeId(id: Scalars['ID']): Promise<Readonly<Omit<ResultType<${typeName}>, 'metrics'>>> {
  const primaryKeyValues = Base64.decode(id).split(':').slice(1).join(':').split('#');

  const primaryKey: Query${typeName}Input = {
    ${primaryKey.partitionKeyFields
      .map(
        (field, index) =>
          `${field.fieldName}: ${fieldStringToFieldType(
            field,
            `primaryKeyValues[${index + 1}]`
          )},`
      )
      .join('\n')}
  }

  ${sortKeyFields
    .map(
      (field, index) => `
  if (typeof primaryKeyValues[${index + 2}] !== 'undefined') {
    // @ts-ignore - TSC will usually see this as an error because it determined
    // that primaryKey is the no-sort-fields-specified version of the type.
    primaryKey.${field.fieldName} = ${fieldStringToFieldType(
        field,
        `primaryKeyValues[${primaryKey.partitionKeyFields.length + index + 3}]`
      )};
  }
 `
    )
    .join('\n')}

  const {capacity, items} = await query${typeName}(primaryKey);

  assert(items.length > 0, () => new NotFoundError('${typeName}', primaryKey));
  assert(items.length < 2, () => new DataIntegrityError(\`Found multiple ${typeName} with id \${id}\`));

  return {capacity, item: items[0]};
}

${
  isPublicModel
    ? `
/** queries the ${typeName} table by primary key using a node id */
export async function query${typeName}ByPublicId(publicId: Scalars['String']): Promise<Readonly<Omit<ResultType<${typeName}>, 'metrics'>>> {
  const {capacity, items} = await query${typeName}({index: 'publicId', publicId});

  assert(items.length > 0, () => new NotFoundError('${typeName}', {publicId}));
  assert(items.length < 2, () => new DataIntegrityError(\`Found multiple ${typeName} with publicId \${publicId}\`));

  return {capacity, item: items[0]};
}`
    : ''
}

`;
}

/** helper */
function makeTypeSignature(
  primaryKey: PrimaryKeyConfig,
  secondaryIndexes: readonly SecondaryIndex[]
): string {
  return (
    [primaryKey, ...secondaryIndexes]
      .map((index) => {
        // The double array allows spreading into the fromEntries call which
        // avoids undesirable "undefined" values.
        const name = 'name' in index ? [['index', `'${index.name}'`]] : [];

        if (index.type === 'primary' || index.type === 'gsi') {
          if (index.isComposite) {
            return [undefined, ...index.sortKeyFields].map((_, i) =>
              Object.fromEntries([
                ...name,
                ...[
                  ...index.partitionKeyFields.map(getTypeScriptTypeForField),
                  ...index.sortKeyFields
                    .slice(0, i)
                    .map(getTypeScriptTypeForField),
                ].sort(),
              ])
            );
          }

          return Object.fromEntries([
            ...name,
            ...index.partitionKeyFields.map(getTypeScriptTypeForField).sort(),
          ]);
        }

        return [undefined, ...index.sortKeyFields].map((_, i) =>
          Object.fromEntries([
            ...name,
            ...[
              ...primaryKey.partitionKeyFields.map(getTypeScriptTypeForField),
              ...index.sortKeyFields.slice(0, i).map(getTypeScriptTypeForField),
            ].sort(),
          ])
        );
      })
      // .map((arg) => Object.fromEntries(arg))
      .flat()
      .map(objectToString)
      .join(' | ')
  );
}

/** helper */
function fieldStringToFieldType(
  {isDateType, typeName}: Field,
  fragment: string
): string {
  if (isDateType) {
    return `new Date(${fragment})`;
  }

  if (typeName === 'Float' || typeName === 'Int') {
    return `Number(${fragment})`;
  }

  if (typeName === 'Boolean') {
    return `Boolean(${fragment})`;
  }

  if (typeName === 'String') {
    return fragment;
  }

  return `${fragment} as ${typeName}`;
}

/** helper */
function eanForQuery(
  primaryKey: PrimaryKeyConfig,
  secondaryIndexes: readonly SecondaryIndex[]
) {
  return `
  if ('index' in input) {
${secondaryIndexes
  .map(
    (index) => `if (input.index === '${index.name}') {
    return ${keyNames(index)}
  }`
  )
  .join('else\n')}
  throw new Error('Invalid index. If TypeScript did not catch this, then this is a bug in codegen.');
}
  else {
    return ${keyNames(primaryKey)}
  }

`;
}

/** helper */
function keyNames(key: PrimaryKeyConfig | SecondaryIndex) {
  if (key.type === 'primary') {
    return key.isComposite ? `{'#pk': 'pk', '#sk': 'sk'}` : `{'#pk': 'pk'}`;
  }

  if (key.type === 'gsi') {
    if (key.name === 'publicId') {
      return `{'#pk': 'publicId'}`;
    }

    const pk = `${key.name}pk`;
    const sk = `${key.name}sk`;
    return key.isComposite
      ? `{'#pk': '${pk}', '#sk': '${sk}'}`
      : `{'#pk': '${pk}'}`;
  }

  return `{'#pk': 'pk', '#sk': 'sk'}`;
}

/** helper */
function eavForQuery(
  primaryKey: PrimaryKeyConfig,
  secondaryIndexes: readonly SecondaryIndex[]
) {
  return `
  if ('index' in input) {
${secondaryIndexes
  .map(
    (index) => `if (input.index === '${index.name}') {
    return ${keyValues(primaryKey, index)}
  }`
  )
  .join('else\n')}
  throw new Error('Invalid index. If TypeScript did not catch this, then this is a bug in codegen.');
  }
  else {
    return ${keyValues(primaryKey, primaryKey)}
  }

`;
}

/** helper */
function compositeKeyValues({
  pkPrefix,
  pkFields,
  skPrefix,
  skFields,
}: {
  pkPrefix: string | undefined;
  pkFields: readonly Field[];
  skPrefix: string | undefined;
  skFields: readonly Field[];
}) {
  const pkFragment = makeKeyTemplate(pkPrefix, pkFields, 'read');
  const skFragment = `['${skPrefix}', ${skFields
    .map(({fieldName}) => `'${fieldName}' in input && input.${fieldName}`)
    .join(', ')}].filter(Boolean).join('#')`;

  return `{
    ':pk': \`${pkFragment}\`,
    ':sk': ${skFragment},
  }`;
}

/** helper */
function simpleKeyValues(
  keyPrefix: string | undefined,
  keyFields: readonly Field[]
) {
  return `{':pk': \`${makeKeyTemplate(keyPrefix, keyFields, 'read')}\`}`;
}

/** helper */
function keyValues(
  primaryKey: PrimaryKeyConfig,
  key: PrimaryKeyConfig | SecondaryIndex
) {
  if (key.type === 'lsi') {
    return compositeKeyValues({
      pkFields: primaryKey.partitionKeyFields,
      pkPrefix: primaryKey.partitionKeyPrefix,
      skFields: key.sortKeyFields,
      skPrefix: key.sortKeyPrefix,
    });
  }

  if (key.isComposite) {
    return compositeKeyValues({
      pkFields: key.partitionKeyFields,
      pkPrefix: key.partitionKeyPrefix,
      skFields: key.sortKeyFields,
      skPrefix: key.sortKeyPrefix,
    });
  }

  return simpleKeyValues(key.partitionKeyPrefix, key.partitionKeyFields);
}

/** helper */
function kceForQuery(
  primaryKey: PrimaryKeyConfig,
  secondaryIndexes: readonly SecondaryIndex[]
) {
  return `
  if ('index' in input) {
${secondaryIndexes
  .map(
    (index) => `if (input.index === '${index.name}') {
    return ${kce(index)}
  }`
  )
  .join('else\n')}
  throw new Error('Invalid index. If TypeScript did not catch this, then this is a bug in codegen.');
  }
  else {
    return ${kce(primaryKey)}
  }
`;
}

/** helper */
function kce(key: PrimaryKeyConfig | SecondaryIndex) {
  if (key.isComposite) {
    // eslint-disable-next-line no-template-curly-in-string
    return "`#pk = :pk AND ${operator === 'begins_with' ? 'begins_with(#sk, :sk)' : `#sk ${operator} :sk`}`";
  }

  return "'#pk = :pk'";
}
