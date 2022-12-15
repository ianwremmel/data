import assert from 'assert';

import type {GraphQLObjectType} from 'graphql';

import {unmarshalField} from '../../../common/helpers';
import {extractKeyInfo} from '../../../common/keys';
import type {Table} from '../../../parser';

export interface UnmarshallTplInput {
  readonly irTable: Table;
  readonly objType: GraphQLObjectType;
}

/** Generates the unmarshall function for a table */
export function unmarshallTpl({
  irTable: {fields, typeName},
  objType,
}: UnmarshallTplInput): string {
  const keyInfo = extractKeyInfo(objType);

  const requiredFields = fields.filter((f) => f.isRequired);
  const optionalFields = fields.filter((f) => !f.isRequired);

  return `
/** Unmarshalls a DynamoDB record into a ${typeName} object */
export function unmarshall${typeName}(item: Record<string, any>): ${typeName} {

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

  let result: ${typeName} = {
${requiredFields.map((field) => {
  // This isn't ideal, but it'll work for now. I need a better way to deal
  // with simple primary keys and Nodes
  if (field.fieldName === 'id' && keyInfo.unmarshall.length) {
    assert(
      keyInfo.unmarshall.length === 1,
      'Expected exactly one key field to unmarshal'
    );
    return keyInfo.unmarshall[0];
  }
  return unmarshalField(field);
})}
  };

${optionalFields
  .map(
    (field) =>
      `
  if ('${field.columnName}' in item) {
    result = {
      ...result,
      ${unmarshalField(field)}
    }
  }
  `
  )
  .join('\n')}

  return result;
}
`;
}
