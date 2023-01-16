import assert from 'assert';

import {filterNull} from '../../../common/filters';
import type {Field} from '../../../parser';

/** Gets the TypeScript type for that corresponds to the field. */
export function getTypeScriptTypeForField({
  fieldName,
  isRequired,
  isScalarType: isScalar,
  typeName,
}: Field): [string, string] {
  if (isRequired) {
    if (isScalar) {
      return [fieldName, `Scalars["${typeName}"]`];
    }
    return [fieldName, typeName];
  }

  if (isScalar) {
    return [`${fieldName}?`, `Maybe<Scalars["${typeName}"]>`];
  }

  return [`${fieldName}?`, `Maybe<${typeName}>`];
}

/**
 * Marshalls the specified field value for use with ddb.
 */
export function marshallField({
  columnName,
  fieldName,
  isDateType,
}: Field): string {
  if (columnName === 'ttl') {
    return `Math.floor(input.${fieldName}.getTime()/1000)`;
  }
  return isDateType ? `input.${fieldName}.getTime()` : `input.${fieldName}`;
}

/** Generates the template for producing the desired primary key or index column */
export function makeKeyTemplate(
  prefix: string | undefined,
  fields: readonly Field[],
  mode: 'blind' | 'create' | 'read'
): string {
  return [
    prefix,
    ...fields.map((field) => {
      const {fieldName} = field;
      if (fieldName === 'createdAt') {
        if (mode === 'blind') {
          return "'createdAt' in input ? input.createdAt.getTime() : now.getTime()";
        }
        if (mode === 'create') {
          // this template gets passed through so it's available in the output.
          // eslint-disable-next-line no-template-curly-in-string
          return '${now.getTime()}';
        }
        if (mode === 'read') {
          return 'input.createdAt.getTime()';
        }
        assert.fail('Invalid mode');
      }
      if (fieldName === 'updatedAt') {
        // this template gets passed through so it's available in the output.
        // eslint-disable-next-line no-template-curly-in-string
        return '${now.getTime()}';
      }
      return `\${${marshallField(field)}}`;
    }),
  ]
    .filter(filterNull)
    .join('#');
}

/** Converts a compile time object to a runtime object */
export function objectToString(obj: Record<string, string>): string {
  return `{${Object.entries(obj).map(([k, value]) => `${k}: ${value}`)}}`;
}

/**
 * Helper function for building a field unmarshaller
 */
export function unmarshallField({
  columnName,
  fieldName,
  isDateType,
  isRequired,
}: Field) {
  let out = `item.${columnName}`;

  if (columnName === 'ttl') {
    out = `${out} * 1000`;
  }

  if (isDateType) {
    if (isRequired) {
      out = `new Date(${out})`;
    } else {
      out = `${out} ? new Date(${out}) : null`;
    }
  }

  return `${fieldName}: ${out}`;
}
