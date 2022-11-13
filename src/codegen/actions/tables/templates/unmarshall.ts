import assert from 'assert';

import {GraphQLField, GraphQLObjectType} from 'graphql';

import {hasDirective, unmarshalField} from '../../../common/helpers';
import {extractKeyInfo} from '../../../common/keys';

export interface UnmarshallTplInput {
  readonly objType: GraphQLObjectType;
}

/** helper */
function getAliasForField(field: GraphQLField<unknown, unknown>) {
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

/** Generates the unmarshall function for a table */
export function unmarshallTpl({objType}: UnmarshallTplInput): string {
  const keyInfo = extractKeyInfo(objType);

  return `
/** Unmarshalls a DynamoDB record into a ${objType.name} object */
export function unmarshall${objType.name}(item: Record<string, any>): ${
    objType.name
  } {
  return {
    ${Object.values(objType.getFields()).map((field) => {
      // This isn't ideal, but it'll work for now. I need a better way to deal
      // with simple primary keys and Nodes
      if (field.name === 'id' && keyInfo.unmarshall.length) {
        assert(
          keyInfo.unmarshall.length === 1,
          'Expected exactly one key field to unmarshal'
        );
        return keyInfo.unmarshall[0];
      }
      return unmarshalField(field, getAliasForField(field));
    })}
  };
}
`;
}
