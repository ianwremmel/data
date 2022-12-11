import type {GraphQLObjectType} from 'graphql';

import {getArgStringValue, getDirective, getOptionalDirective} from './helpers';
/**
 * Determines table in which a particular Modal should be stored.
 */
export function extractTableName(type: GraphQLObjectType): string {
  const directive = getOptionalDirective('tableName', type);
  if (directive) {
    return getArgStringValue('name', directive);
  }
  return `Table${type.name}`;
}
