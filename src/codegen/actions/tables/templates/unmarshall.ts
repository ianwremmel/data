import type {Model} from '../../../parser';
import {defineComputedOutputFields} from '../computed-fields';

import {unmarshallField} from './helpers';

export const DIVIDER = '#:#';

export interface UnmarshallTplInput {
  readonly model: Model;
}

/** Generates the unmarshall function for a table */
export function unmarshallTpl({
  model: {fields, primaryKey, typeName},
}: UnmarshallTplInput): string {
  const requiredFields = fields
    .filter((f) => f.isRequired)
    .filter(({computeFunction}) => !computeFunction?.isVirtual);
  const optionalFields = fields
    .filter((f) => !f.isRequired)
    .filter(({computeFunction}) => !computeFunction?.isVirtual);

  return `
/** Unmarshalls a DynamoDB record into a ${typeName} object */
export function unmarshall${typeName}(item: Record<string, any>): ${typeName} {

${requiredFields
  // id is a computed field and therefore never present in the DynamoDB record
  .filter(({fieldName}) => fieldName !== 'id')
  .map(({columnName, fieldName}) => {
    return `
  assert(
    item.${columnName} !== null,
    () => new DataIntegrityError('Expected ${fieldName} to be non-null')
  );
  assert(
    typeof item.${columnName} !== 'undefined',
    () => new DataIntegrityError('Expected ${fieldName} to be defined')
  );
`;
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
  return unmarshallField(field);
})}
  };

${optionalFields
  .map(
    (field) =>
      `
  if ('${field.columnName}' in item) {
    result = {
      ...result,
      ${unmarshallField(field)}
    }
  }
  `
  )
  .join('\n')}

  ${defineComputedOutputFields(fields, typeName)}

  return result;
}
`;
}
