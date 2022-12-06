import type {
  ConstDirectiveNode,
  GraphQLObjectType,
  GraphQLField,
} from 'graphql';

import {getArgFieldTypeValues, getOptionalArgStringValue} from './helpers';
import {makeKeyTemplate} from './keys';

export interface IndexInfo {
  readonly ean: readonly string[];
  readonly eav: readonly string[];
  readonly indexes: readonly IndexFieldInfo[];
  readonly updateExpressions: readonly string[];
}

export interface PartitionKeyIndexInfo {
  readonly pkPrefix?: string;
  readonly pkFields: readonly GraphQLField<unknown, unknown>[];
}

export interface CompositeKeyIndexInfo {
  readonly pkPrefix?: string;
  readonly skPrefix?: string;
  readonly pkFields: readonly GraphQLField<unknown, unknown>[];
  readonly skFields: readonly GraphQLField<unknown, unknown>[];
}

export type PrimaryIndex = PartitionKeyIndexInfo | CompositeKeyIndexInfo;

export type IndexFieldInfo = PrimaryIndex | GSI | LSI;

/**
 * Returns the index info for the given object type.
 */
export function extractIndexInfo(type: GraphQLObjectType): IndexInfo {
  const directives =
    type?.astNode?.directives?.filter(
      (d) =>
        d.name.value === 'compositeIndex' || d.name.value === 'secondaryIndex'
    ) ?? [];

  if (!directives.length) {
    return {
      ean: [],
      eav: [],
      indexes: [],
      updateExpressions: [],
    };
  }

  const ean = [];
  const eav = [];
  const indexes = [];
  const updateExpressions = [];

  for (const directive of directives) {
    const result =
      directive.name.value === 'secondaryIndex'
        ? extractLocalSecondaryIndexInfo(type, directive)
        : extractGlobalSecondaryIndexInfo(type, directive);

    ean.push(...result.ean);
    eav.push(...result.eav);

    updateExpressions.push(...result.updateExpressions);

    indexes.push(result.index);
  }

  return {ean, eav, indexes, updateExpressions};
}

export interface SpecificIndexInfo<T> {
  readonly ean: readonly string[];
  readonly eav: readonly string[];
  readonly index: T;
  readonly updateExpressions: readonly string[];
}

export type GSI = (PartitionKeyIndexInfo | CompositeKeyIndexInfo) & {
  readonly name: string;
  readonly type: 'gsi';
};

/** helper */
export function extractGlobalSecondaryIndexInfo(
  type: GraphQLObjectType,
  directive: ConstDirectiveNode
): SpecificIndexInfo<GSI> {
  const name = getOptionalArgStringValue('name', directive);

  const pkFields = getArgFieldTypeValues('pkFields', type, directive);
  const skFields = getArgFieldTypeValues('skFields', type, directive);
  const pkPrefix = getOptionalArgStringValue('pkPrefix', directive);
  const skPrefix = getOptionalArgStringValue('skPrefix', directive);

  return {
    ean: [`'#${name}pk': '${name}pk'`, `'#${name}sk': '${name}sk'`],
    eav: [
      `':${name}pk': \`${makeKeyTemplate(pkPrefix, pkFields)}\``,
      `':${name}sk': \`${makeKeyTemplate(skPrefix, skFields)}\``,
    ],
    index: {
      name,
      pkFields,
      pkPrefix,
      skFields,
      skPrefix,
      type: 'gsi',
    },
    updateExpressions: [`#${name}pk = :${name}pk`, `#${name}sk = :${name}sk`],
  };
}

export interface LSI {
  readonly name: string;
  readonly type: 'lsi';
  readonly skPrefix?: string;
  readonly skFields: readonly GraphQLField<unknown, unknown>[];
}

/** helper */
export function extractLocalSecondaryIndexInfo(
  type: GraphQLObjectType,
  directive: ConstDirectiveNode
): SpecificIndexInfo<LSI> {
  const name = getOptionalArgStringValue('name', directive);

  const skFields = getArgFieldTypeValues('fields', type, directive);
  const skPrefix = getOptionalArgStringValue('prefix', directive);

  return {
    ean: [`'#${name}sk': '${name}sk'`],
    eav: [`':${name}sk': \`${makeKeyTemplate(skPrefix, skFields)}\``],
    index: {
      name,
      skFields,
      skPrefix,
      type: 'lsi',
    },
    updateExpressions: [`#${name}sk = :${name}sk`],
  };
}
