import type {GraphQLObjectType} from 'graphql';
import {snakeCase} from 'lodash';

/**
 * Generates the code for checking that the environment variables for this
 * table's name has been set.
 */
export function ensureTableTemplate(
  objType: GraphQLObjectType | string
): string {
  if (typeof objType === 'string') {
    return `  const tableName = process.env.${snakeCase(objType).toUpperCase()};
  assert(tableName, '${snakeCase(objType).toUpperCase()} is not set');`;
  }
  return `  const tableName = process.env.TABLE_${snakeCase(
    objType.name
  ).toUpperCase()};
  assert(tableName, 'TABLE_${snakeCase(
    objType.name
  ).toUpperCase()} is not set');`;
}
