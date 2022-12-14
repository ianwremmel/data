import assert from 'assert';

import type {GraphQLField} from 'graphql';

import {getTypeScriptTypeForField, isType} from '../../../common/helpers';
import type {IndexFieldInfo, PrimaryIndex} from '../../../common/indexes';
import {makeKeyTemplate} from '../../../common/keys';

import {ensureTableTemplate} from './ensure-table';

export interface QueryTplInput {
  readonly consistent: boolean;
  readonly indexes: readonly IndexFieldInfo[];
  readonly tableName: string;
  readonly typeName: string;
}

/** helper */
function makePartialKeyTemplate(
  prefix: string,
  fields: readonly GraphQLField<unknown, unknown>[]
): string {
  return `['${prefix}', ${fields
    .map((f) => `'${f.name}' in input && input.${f.name}`)
    .join(', ')}].filter(Boolean).join('#')`;
}

/** Generates the type signature for the query function */
function indexInfoToTypeSignature(
  primaryIndex: PrimaryIndex,
  indexInfo: IndexFieldInfo
): string | string[] {
  const name = 'name' in indexInfo ? `index: '${indexInfo.name}'` : '';

  if ('pkFields' in indexInfo && 'skFields' in indexInfo) {
    const {pkFields, skFields} = indexInfo;
    return [undefined, ...skFields].map((_, index) =>
      [
        name,
        ...[
          ...pkFields.map(renderFieldAsType),
          ...skFields.slice(0, index).map(renderFieldAsType),
        ].sort(),
      ].join('\n')
    );
  }

  if ('pkFields' in indexInfo) {
    const {pkFields} = indexInfo;
    return [name, ...pkFields.map(renderFieldAsType)].sort().join('\n');
  }

  const {pkFields} = primaryIndex;
  const {skFields} = indexInfo;
  return [undefined, ...skFields].map((_, index) =>
    [
      name,
      ...[
        ...pkFields.map(renderFieldAsType),
        ...skFields.slice(0, index).map(renderFieldAsType),
      ].sort(),
    ].join('\n')
  );
}

/** Generates the sort key for the query function */
function indexToSortKey(indexInfo: IndexFieldInfo): string {
  if ('skFields' in indexInfo) {
    const {skFields, skPrefix} = indexInfo;
    if ('name' in indexInfo) {
      return `
if (input.index === '${indexInfo.name}') {
  return ${makePartialKeyTemplate(skPrefix ?? '', skFields)};
}`;
    }
    return `return ${makePartialKeyTemplate(skPrefix ?? '', skFields)}`;
  }

  return '';
}

/** helper */
function renderFieldAsType(field: GraphQLField<unknown, unknown>): string {
  return `  ${field.name}: ${getTypeScriptTypeForField(field)};`;
}

/** helper */
function fieldStringToFieldType(
  field: GraphQLField<unknown, unknown>,
  fragment: string
): string {
  if (isType('Date', field)) {
    return `new Date(${fragment})`;
  }

  if (isType('Int', field) || isType('Float', field)) {
    return `Number(${fragment})`;
  }

  if (isType('Boolean', field)) {
    return `Boolean(${fragment})`;
  }

  if (isType('String', field)) {
    return fragment;
  }

  return `${fragment} as ${field.type.toString().replace(/!$/, '')}`;
}

/** helper */
function pkEavTemplate(
  lsis: readonly string[],
  gsis: readonly string[]
): string {
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
  const lsis = [${lsis.map((l) => l).join(', ')}];
  if (lsis.includes(input.index)) {
    return 'pk';
  }
  return \`\${input.index}pk\`;
}
return 'pk'
`;
}

/** helper */
function skEavTemplate(
  lsis: readonly string[],
  gsis: readonly string[]
): string {
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
  const lsis = [${lsis.map((l) => l).join(', ')}];
  if (lsis.includes(input.index)) {
    return input.index;
  }
  return \`\${input.index}sk\`;
}
return 'sk'
`;
}

/** template */
export function queryTpl({
  consistent,
  indexes,
  tableName,
  typeName,
}: QueryTplInput) {
  const primaryIndex = indexes.find((i) => !('name' in i)) as PrimaryIndex;
  assert(primaryIndex, 'Expected primary index to exist');

  const hasIndexes =
    indexes.filter((index) => 'type' in index && index.type === 'gsi').length >
    0;

  const inputTypeName = `Query${typeName}Input`;
  const outputTypeName = `Query${typeName}Output`;

  const typeSignature = indexes
    .flatMap((indexInfo) => indexInfoToTypeSignature(primaryIndex, indexInfo))
    .map((t) => `{${t}}`)
    .join(' | ');

  const gsis = indexes
    .filter((info) => 'type' in info && info.type === 'gsi')
    .map((info) => `'${'name' in info && info.name}'`);

  const lsis = indexes
    .filter((info) => 'type' in info && info.type === 'lsi')
    .map((info) => `'${'name' in info && info.name}'`);

  return `
export type ${inputTypeName} = ${typeSignature};
export type ${outputTypeName} = MultiResultType<${typeName}>;

/** helper */
function makePartitionKeyForQuery${typeName}(input: ${inputTypeName}): string {
  ${indexes
    .map((indexInfo) => {
      const {pkFields, pkPrefix} =
        'pkFields' in indexInfo ? indexInfo : primaryIndex;
      if ('name' in indexInfo) {
        return `
if ('index' in input && input.index === '${indexInfo.name}') {
  return \`${makeKeyTemplate(pkPrefix ?? '', pkFields)}\`;
}`;
      }
      return `if (!('index' in input)) {
  return \`${makeKeyTemplate(pkPrefix ?? '', pkFields)}\`
}`;
    })
    .join('\n else ')};

  throw new Error('Could not construct partition key from input');
}

/** helper */
function makeSortKeyForQuery${typeName}(input: ${inputTypeName}): string | undefined {
${makeMakeSortKeyForQuery(indexes)}
}

/** helper */
function makeEavPkForQuery${typeName}(input: ${inputTypeName}): string {
  ${pkEavTemplate(lsis, gsis)}
}

/** helper */
function makeEavSkForQuery${typeName}(input: ${inputTypeName}): string {
  ${skEavTemplate(lsis, gsis)}
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
    ${primaryIndex.pkFields
      .map(
        (field, index) =>
          `${field.name}: ${fieldStringToFieldType(
            field,
            `primaryKeyValues[${index + 1}]`
          )},`
      )
      .join('\n')}
  }

  ${
    'skFields' in primaryIndex &&
    primaryIndex.skFields
      .map(
        (field, index) => `
  if (typeof primaryKeyValues[${index + 2}] !== 'undefined') {
    // @ts-ignore - TSC will usually see this as an error because it determined
    // that primaryKey is the no-sort-fields-specified version of the type.
    primaryKey.${field.name} = ${fieldStringToFieldType(
          field,
          `primaryKeyValues[${primaryIndex.pkFields.length + index + 3}]`
        )};
  }
  `
      )
      .join('\n')
  }

  const {capacity, items} = await query${typeName}(primaryKey);

  assert(items.length > 0, () => new NotFoundError('${typeName}', primaryKey));
  assert(items.length < 2, () => new DataIntegrityError(\`Found multiple ${typeName} with id \${id}\`));

  return {capacity, item: items[0]};
}
  `;
}

/** helper */
function makeMakeSortKeyForQuery(indexes: readonly IndexFieldInfo[]) {
  const indexInfos = indexes.filter((indexInfo) => 'name' in indexInfo);
  const primaryIndex = indexes.find((indexInfo) => !('name' in indexInfo));
  assert(primaryIndex, 'Expected primary index to exist');

  if (indexInfos.length === 0) {
    return indexToSortKey(primaryIndex);
  }

  return `
  if ('index' in input) {
${indexInfos.map(indexToSortKey).join('\n else ')};
  }
  else {
  ${indexToSortKey(primaryIndex)};
  }
  `;
}
