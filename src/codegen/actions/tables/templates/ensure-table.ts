import {GraphQLObjectType} from 'graphql/index';
import {snakeCase} from 'lodash';

/**
 * Generates the code for checking that the environment variables for this
 * tables's name has been set.
 */
export function ensureTableTemplate(objType: GraphQLObjectType): string {
  return `  const tableName = process.env.TABLE_${snakeCase(
    objType.name
  ).toUpperCase()};
  assert(tableName, 'TABLE_${snakeCase(
    objType.name
  ).toUpperCase()} is not set');`;
}
