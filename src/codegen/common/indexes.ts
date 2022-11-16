import type {GraphQLObjectType} from 'graphql';
import type {GraphQLField} from 'graphql/index';

import {getArgFieldTypeValues, getOptionalArgStringValue} from './helpers';
import {makeKeyTemplate} from './keys';

export interface IndexInfo {
  readonly ean: readonly string[];
  readonly eav: readonly string[];
  readonly indexes: readonly IndexFieldInfo[];
  readonly updateExpressions: readonly string[];
}

export interface PartitionKeyIndexInfo {
  readonly name?: string;
  readonly pkPrefix?: string;
  readonly pkFields: readonly GraphQLField<unknown, unknown>[];
}

export interface ComposityKeyIndexInfo {
  readonly name?: string;
  readonly pkPrefix?: string;
  readonly skPrefix?: string;
  readonly pkFields: readonly GraphQLField<unknown, unknown>[];
  readonly skFields: readonly GraphQLField<unknown, unknown>[];
}

export type IndexFieldInfo = PartitionKeyIndexInfo | ComposityKeyIndexInfo;

/**
 * Returns the index info for the given object type.
 */
export function extractIndexInfo(type: GraphQLObjectType): IndexInfo {
  const directives =
    type?.astNode?.directives?.filter(
      (d) => d.name.value === 'compositeIndex'
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
    const name = getOptionalArgStringValue('name', directive);

    const pkFields = getArgFieldTypeValues('pkFields', type, directive);
    const skFields = getArgFieldTypeValues('skFields', type, directive);
    const pkPrefix = getOptionalArgStringValue('pkPrefix', directive);
    const skPrefix = getOptionalArgStringValue('skPrefix', directive);

    ean.push(`'#${name}pk': '${name}pk'`);
    ean.push(`'#${name}sk': '${name}sk'`);
    eav.push(`':${name}pk': \`${makeKeyTemplate(pkPrefix, pkFields)}\``);
    eav.push(`':${name}sk': \`${makeKeyTemplate(skPrefix, skFields)}\``);

    updateExpressions.push(`#${name}pk = :${name}pk`);
    updateExpressions.push(`#${name}sk = :${name}sk`);

    indexes.push({
      name,
      pkFields,
      pkPrefix,
      skFields,
      skPrefix,
    });
  }

  return {ean, eav, indexes, updateExpressions};
}
