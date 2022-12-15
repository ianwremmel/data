import type {GraphQLField} from 'graphql/index';

import {hasDirective} from './helpers';

/** helper */
export function getAliasForField(field: GraphQLField<unknown, unknown>) {
  if (hasDirective('ttl', field)) {
    return 'ttl';
  }
  switch (field.name) {
    case 'version':
      return '_v';
    case 'createdAt':
      return '_ct';
    case 'updatedAt':
      return '_md';
    default:
      return undefined;
  }
}
