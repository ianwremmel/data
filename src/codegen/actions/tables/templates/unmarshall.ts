import {isDataView} from 'util/types';

import type {Field, Model} from '../../../parser';

import {unmarshallField, unmarshallFieldValue} from './helpers';

export const DIVIDER = '#:#';

export interface UnmarshallTplInput {
  readonly table: Model;
}

/** Generates the unmarshall function for a table */
export function unmarshallTpl({
  table: {fields, primaryKey, typeName},
}: UnmarshallTplInput): string {
  const requiredFields = fields.filter((f) => f.isRequired);
  const optionalFields = fields.filter((f) => !f.isRequired);

  return `
/** Unmarshalls a DynamoDB record into a ${typeName} object */
export function unmarshall${typeName}(item: Record<string, any>): ${typeName} {

${requiredFields
  .filter(({isVirtual}) => !isVirtual)
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
${requiredFields
  .map((field) => {
    // This isn't ideal, but it'll work for now. I need a better way to deal
    // with simple primary keys and Nodes
    if (field.fieldName === 'id') {
      if (primaryKey.isComposite) {
        return `id: Base64.encode(\`${typeName}:\${item.pk}${DIVIDER}\${item.sk}\`)`;
      }
      return `id: Base64.encode(\`${typeName}:\${item.pk}\`)`;
    }
    if (field.isVirtual) {
      return '';
    }
    return unmarshallField(field);
  })
  .join(',\n')}
  };

${optionalFields
  .filter(({isVirtual}) => !isVirtual)
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

  ${defineComputedFields(fields)}

  return result;
}
`;
}

/**
 * Uses Object.defineProperty to add computes fields to the database result  so
 * that order-of-access doesn't matter.
 */
function defineComputedFields(fields: readonly Field[]): string {
  return fields
    .filter(({computeFunction}) => !!computeFunction)
    .map((field) => {
      const {fieldName, computeFunction} = field;
      return `
      const ${fieldName}DatabaseValue = ${unmarshallFieldValue(field)};
      let ${fieldName}ComputedValue: any;
      Object.defineProperty(result, '${fieldName}', {
          enumerable: true,
          /** getter */
          get() {
            if (typeof ${fieldName}ComputedValue === 'undefined') {
              ${fieldName}ComputedValue = ${
        computeFunction?.importName
      }(${fieldName}DatabaseValue, this);
            }
            return ${fieldName}ComputedValue;
          }
        })
      `;
    })
    .join('\n');
}
