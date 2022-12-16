import type {
  Field,
  GSI,
  LSI,
  PrimaryKeyConfig,
  SecondaryIndex,
} from '../../../parser';

import {ensureTableTemplate} from './ensure-table';
import {
  getTypeScriptTypeForField,
  makeKeyTemplate,
  objectToString,
} from './helpers';

export interface QueryTplInput {
  readonly consistent: boolean;
  readonly primaryKey: PrimaryKeyConfig;
  readonly secondaryIndexes: readonly SecondaryIndex[];
  readonly tableName: string;
  readonly typeName: string;
}

/** template */
export function queryTpl({
  consistent,
  primaryKey,
  secondaryIndexes,
  tableName,
  typeName,
}: QueryTplInput): string {
  const hasIndexes = secondaryIndexes.length > 0;

  const sortKeyFields = primaryKey.isComposite ? primaryKey.sortKeyFields : [];

  const lsis: LSI[] = secondaryIndexes.filter(
    ({type}) => type === 'lsi'
  ) as LSI[];
  const gsis: GSI[] = secondaryIndexes.filter(
    ({type}) => type === 'gsi'
  ) as GSI[];

  const inputTypeName = `Query${typeName}Input`;
  const outputTypeName = `Query${typeName}Output`;

  return `
export type ${inputTypeName} = ${makeTypeSignature(
    primaryKey,
    secondaryIndexes
  )};
export type ${outputTypeName} = MultiResultType<${typeName}>;


/** helper */
function makePartitionKeyForQuery${typeName}(input: ${inputTypeName}): string {
${makePartitionKeyForQuery(primaryKey, secondaryIndexes)}

throw new Error('Could not construct partition key from input');
}

/** helper */
function makeSortKeyForQuery${typeName}(input: ${inputTypeName}): string | undefined {
${makeSortKeyForQuery(primaryKey, secondaryIndexes)}
}

/** helper */
function makeEavPkForQuery${typeName}(input: ${inputTypeName}): string {
${pkEavTemplate(gsis, lsis)}
}

/** helper */
function makeEavSkForQuery${typeName}(input: ${inputTypeName}): string {
${skEavTemplate(gsis, lsis)}
}

/** query${typeName} */
export async function query${typeName}(input: Readonly<Query${typeName}Input>, {limit = undefined, operator = 'begins_with', reverse = false}: QueryOptions = {}): Promise<Readonly<${outputTypeName}>> {
  ${ensureTableTemplate(tableName)}

  const {ConsumedCapacity: capacity, Items: items = []} = await ddbDocClient.send(new QueryCommand({
    ConsistentRead: ${consistent ? `!('index' in input)` : 'false'},
    ExpressionAttributeNames: {
      '#pk': makeEavPkForQuery${typeName}(input),
      '#sk': makeEavSkForQuery${typeName}(input),
    },
    ExpressionAttributeValues: {
      ':pk': makePartitionKeyForQuery${typeName}(input),
      ':sk': makeSortKeyForQuery${typeName}(input),
    },
    IndexName: ${
      hasIndexes ? `'index' in input ? input.index : undefined` : 'undefined'
    },
    KeyConditionExpression: \`#pk = :pk AND \${operator === 'begins_with' ? 'begins_with(#sk, :sk)' : \`#sk \${operator} :sk\`}\`,
    Limit: limit,
    ReturnConsumedCapacity: 'INDEXES',
    ScanIndexForward: !reverse,
    TableName: tableName,
  }));

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

          return Object.fromEntries(
            index.partitionKeyFields.map(getTypeScriptTypeForField).sort()
          );
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
function indexToSortKey(index: PrimaryKeyConfig | SecondaryIndex): string {
  if (!index.isComposite) {
    return '';
  }

  if ('name' in index) {
    return `
if (input.index === '${index.name}') {
  return ${makePartialKeyTemplate(
    index.sortKeyPrefix ?? '',
    index.sortKeyFields
  )};
}`;
  }
  return `return ${makePartialKeyTemplate(
    index.sortKeyPrefix ?? '',
    index.sortKeyFields
  )}`;
}

/** template */
function makePartitionKeyForQuery(
  primaryKey: PrimaryKeyConfig,
  secondaryIndex: readonly SecondaryIndex[]
) {
  return [primaryKey, ...secondaryIndex]
    .map((index) => {
      const partitionKeyFields =
        index.type === 'lsi'
          ? primaryKey.partitionKeyFields
          : index.partitionKeyFields;

      const partitionKeyPrefix =
        index.type === 'lsi'
          ? primaryKey.partitionKeyPrefix
          : index.partitionKeyPrefix;

      if (index.type === 'primary') {
        return `if (!('index' in input)) {
  return \`${makeKeyTemplate(partitionKeyPrefix ?? '', partitionKeyFields)}\`
}`;
      }

      return `
if ('index' in input && input.index === '${index.name}') {
  return \`${makeKeyTemplate(partitionKeyPrefix ?? '', partitionKeyFields)}\`;
}`;
    })
    .join('\n else ');
}

/** template */
function makeSortKeyForQuery(
  primaryKey: PrimaryKeyConfig,
  secondaryIndex: readonly SecondaryIndex[]
) {
  if (secondaryIndex.length === 0) {
    return indexToSortKey(primaryKey);
  }

  return `
  if ('index' in input) {
${secondaryIndex.map(indexToSortKey).join('\n else ')};
  }
  else {
    ${indexToSortKey(primaryKey)};
  }
  `;
}

/** helper */
function makePartialKeyTemplate(
  prefix: string,
  fields: readonly Field[]
): string {
  return `['${prefix}', ${fields
    .map(({fieldName}) => `'${fieldName}' in input && input.${fieldName}`)
    .join(', ')}].filter(Boolean).join('#')`;
}

/** template */
function pkEavTemplate(gsis: readonly GSI[], lsis: readonly LSI[]) {
  if (gsis.length === 0) {
    return "return 'pk'";
  }

  if (lsis.length === 0) {
    return `
if ('index' in input) {
  return \`\${input.index}pk\`;
}
return 'pk';
    `;
  }

  return `
if ('index' in input) {
  const lsis = [${lsis.map(({name}) => `'${name}'`).join(', ')}];
  if (lsis.includes(input.index)) {
    return 'pk';
  }
  return \`\${input.index}pk\`;
}
return 'pk'
`;
}

/** template */
function skEavTemplate(gsis: readonly GSI[], lsis: readonly LSI[]) {
  if (gsis.length === 0) {
    return "return 'sk'";
  }

  if (lsis.length === 0) {
    return `
if ('index' in input) {
  return \`\${input.index}sk\`;
}
return 'sk';
    `;
  }

  return `
if ('index' in input) {
  const lsis = [${lsis.map(({name}) => `'${name}'`).join(', ')}];
  if (lsis.includes(input.index)) {
    return input.index;
  }
  return \`\${input.index}sk\`;
}
return 'sk'
`;
}
