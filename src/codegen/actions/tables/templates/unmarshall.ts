import {unmarshalField} from '../../../common/helpers';
import type {Table} from '../../../parser';

export const DIVIDER = '#:#';

export interface UnmarshallTplInput {
  readonly irTable: Table;
}

/** Generates the unmarshall function for a table */
export function unmarshallTpl({
  irTable: {fields, primaryKey, typeName},
}: UnmarshallTplInput): string {
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
  if (field.fieldName === 'id') {
    if (primaryKey.isComposite) {
      return `id: Base64.encode(\`${typeName}:\${item.pk}${DIVIDER}\${item.sk}\`)`;
    }
    return `id: Base64.encode(\`${typeName}:\${item.pk}\`)`;
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
