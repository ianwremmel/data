import type {GraphQLField, GraphQLObjectType} from 'graphql';

import {getTypeScriptTypeForField, hasDirective} from '../../../common/helpers';
import type {IndexFieldInfo} from '../../../common/indexes';
import {makeKeyTemplate} from '../../../common/keys';

import {ensureTableTemplate} from './ensure-table';

export interface QueryTplInput {
  readonly consistent: boolean;
  readonly indexes: readonly IndexFieldInfo[];
  readonly objType: GraphQLObjectType;
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
  indexInfo: IndexFieldInfo
): string | string[] {
  if ('skFields' in indexInfo) {
    const {name, pkFields, skFields} = indexInfo;
    return [undefined, ...skFields].map((_, index) =>
      [
        name ? `index: '${name}'` : '',
        ...[
          ...pkFields.map(renderFieldAsType),
          ...skFields.slice(0, index).map(renderFieldAsType),
        ].sort(),
      ].join('\n')
    );
  }

  const {name, pkFields} = indexInfo;
  return [name ? `index: '${name}'` : '', ...pkFields.map(renderFieldAsType)]
    .sort()
    .join('\n');
}

/** Generates the sort key for the query function */
function indexToSortKey(indexInfo: IndexFieldInfo): string {
  if ('skFields' in indexInfo) {
    const {name, skFields, skPrefix} = indexInfo;
    if (name) {
      return `
if ('index' in input && input.index === '${name}') {
  return ${makePartialKeyTemplate(skPrefix ?? '', skFields)};
}`;
    }
    return `if (!('index' in input)) {
  return ${makePartialKeyTemplate(skPrefix ?? '', skFields)}
}`;
  }

  return '';
}

/** helper */
function renderFieldAsType(field: GraphQLField<unknown, unknown>): string {
  return `  ${field.name}: ${getTypeScriptTypeForField(field)};`;
}

/** template */
export function queryTpl({consistent, indexes, objType}: QueryTplInput) {
  const typeName = objType.name;

  const hasIndexes = hasDirective('compositeIndex', objType);
  const eavPrefix = hasIndexes
    ? '${' + `'index' in input ? input.index : ''` + '}'
    : '';

  const inputTypeName = `Query${typeName}Input`;
  const outputTypeName = `Query${typeName}Output`;

  const typeSignature = indexes
    .flatMap(indexInfoToTypeSignature)
    .map((t) => `{${t}}`)
    .join(' | ');

  return `
export type ${inputTypeName} = ${typeSignature};
export type ${outputTypeName} = MultiResultType<${typeName}>;

/** helper */
function makePartitionKeyForQuery${typeName}(input: ${inputTypeName}): string {
  ${indexes
    .map(({name, pkFields, pkPrefix}) => {
      if (name) {
        return `
if ('index' in input && input.index === '${name}') {
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
${indexes.map(indexToSortKey).join('\n else ')};

  throw new Error('Could not construct sort key from input');
}

/** query${typeName} */
export async function query${typeName}(input: Readonly<Query${typeName}Input>): Promise<Readonly<${outputTypeName}>> {
  ${ensureTableTemplate(objType)}

  const {ConsumedCapacity: capacity, Items: items = []} = await ddbDocClient.send(new QueryCommand({
    ConsistentRead: ${consistent ? `!('index' in input)` : 'false'},
    ExpressionAttributeNames: {
      '#pk': \`${eavPrefix}pk\`,
      '#sk': \`${eavPrefix}sk\`,
    },
    ExpressionAttributeValues: {
      ':pk': makePartitionKeyForQuery${typeName}(input),
      ':sk': makeSortKeyForQuery${typeName}(input),
    },
    IndexName: ${
      hasIndexes ? `'index' in input ? input.index : undefined` : 'undefined'
    },
    KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  }));

  assert(capacity, 'Expected ConsumedCapacity to be returned. This is a bug in codegen.');

  return {
    capacity,
    items: items.map((item) => {
      assert(item._et === '${typeName}', () => new DataIntegrityError('TODO'));
      return unmarshall${objType.name}(item);
    })
  };
}
  `;
}
