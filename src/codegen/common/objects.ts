import type {GraphQLObjectType} from 'graphql';

import {getOptionalArgStringValue, getOptionalDirective} from './helpers';
/**
 * Determines table in which a particular Modal should be stored.
 */
export function extractTableName(type: GraphQLObjectType): string {
  const directive = getOptionalDirective('table', type);
  if (directive) {
    const value = getOptionalArgStringValue('name', directive);
    if (value) {
      return value;
    }
  }
  return `Table${type.name}`;
}
