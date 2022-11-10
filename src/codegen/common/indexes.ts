import {GraphQLObjectType} from 'graphql';

import {getArgFieldTypeValues, getOptionalArgStringValue} from './helpers';
import {makeKeyTemplate} from './keys';

export interface IndexInfo {
  readonly ean: readonly string[];
  readonly eav: readonly string[];
  readonly updateExpressions: readonly string[];
}

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
      updateExpressions: [],
    };
  }

  const ean = [];
  const eav = [];
  const updateExpressions = [];

  for (const directive of directives) {
    const name = getOptionalArgStringValue('name', directive);

    const pkPrefix = getOptionalArgStringValue('pkPrefix', directive);
    const skPrefix = getOptionalArgStringValue('skPrefix', directive);
    const pkFields = getArgFieldTypeValues('pkFields', type, directive);
    const skFields = getArgFieldTypeValues('skFields', type, directive);

    ean.push(`'#${name}pk': '${name}pk'`);
    ean.push(`'#${name}sk': '${name}sk'`);
    eav.push(`':${name}pk': \`${makeKeyTemplate(pkPrefix, pkFields)}\``);
    eav.push(`':${name}sk': \`${makeKeyTemplate(skPrefix, skFields)}\``);

    updateExpressions.push(`#${name}pk = :${name}pk`);
    updateExpressions.push(`#${name}sk = :${name}sk`);
  }

  return {ean, eav, updateExpressions};
}
