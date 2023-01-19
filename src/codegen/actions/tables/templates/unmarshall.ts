import assert from 'assert';

import type {Field, Model} from '../../../parser';

import {unmarshallField, unmarshallFieldValue} from './helpers';

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

  ${defineComputedFields(fields, typeName)}

  return result;
}
`;
}

/**
 * Uses Object.defineProperty to add computes fields to the database result  so
 * that order-of-access doesn't matter.
 */
function defineComputedFields(
  fields: readonly Field[],
  typeName: string
): string {
  return fields
    .filter(({computeFunction}) => !!computeFunction)
    .map((field) => {
      const {fieldName, computeFunction} = field;
      assert(computeFunction);
      const {importName} = computeFunction;
      return `
      let ${fieldName}Computed = false;
      const ${fieldName}DatabaseValue = ${unmarshallFieldValue(field)};
      let ${fieldName}ComputedValue: ${typeName}['${fieldName}'];
      Object.defineProperty(result, '${fieldName}', {
          enumerable: true,
          /** getter */
          get() {
            if (!${fieldName}Computed) {
              ${fieldName}Computed = true
              if (typeof ${fieldName}DatabaseValue !== 'undefined') {
                ${fieldName}ComputedValue = ${fieldName}DatabaseValue;
              }
              else {
                ${fieldName}ComputedValue = ${importName}(this);
              }
            }
            return ${fieldName}ComputedValue;
          }
        })
      `;
    })
    .join('\n');
}
