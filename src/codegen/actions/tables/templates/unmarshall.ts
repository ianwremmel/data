import assert from 'assert';

import type {GraphQLField, GraphQLObjectType} from 'graphql';
import {isNonNullType} from 'graphql';
import {snakeCase} from 'lodash';

import {hasDirective, isType, unmarshalField} from '../../../common/helpers';
import {extractKeyInfo} from '../../../common/keys';

export interface UnmarshallTplInput {
  readonly objType: GraphQLObjectType;
}

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

/** Generates the unmarshall function for a table */
export function unmarshallTpl({objType}: UnmarshallTplInput): string {
  const keyInfo = extractKeyInfo(objType);

  const fields = Object.values(objType.getFields()).map((f) => {
    const fieldName = f.name;
    const columnName = getAliasForField(f) ?? snakeCase(f.name);
    const isDateType = isType('Date', f);
    const isRequired = isNonNullType(f.type);
    return {
      columnName,
      field: f,
      fieldName,
      isDateType,
      isRequired,
    };
  });

  const requiredFields = fields.filter((f) => f.isRequired);
  const optionalFields = fields.filter((f) => !f.isRequired);

  return `
/** Unmarshalls a DynamoDB record into a ${objType.name} object */
export function unmarshall${objType.name}(item: Record<string, any>): ${
    objType.name
  } {

${requiredFields
  .map(({columnName, fieldName}) => {
    return `if ('${columnName}' in item) {
  assert(
    item.${columnName} !== null,
    () => new DataIntegrityError('Expected ${fieldName} to be non-null')
  );
  assert(
    typeof item.${columnName} !== 'undefined',
    () => new DataIntegrityError('Expected ${fieldName} to be defined')
  );
}`;
  })
  .join('\n')}

  let result: ${objType.name} = {
${requiredFields.map(({field}) => {
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

${optionalFields
  .map(({columnName, field}) => {
    return `
  if ('${columnName}' in item) {
    result = {
      ...result,
      ${unmarshalField(field, getAliasForField(field))}
    }
  }
  `;
  })
  .join('\n')}

  return result;
}
`;
}
