import assert from 'assert';

import type {GraphQLField} from 'graphql';

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
export function marshallField(fieldName: string, isDate: boolean): string {
  return isDate ? `input.${fieldName}.getTime()` : `input.${fieldName}`;
}

/** Generates the template for producing the desired primary key or index column */
export function makeKeyTemplate(
  prefix: string,
  fields: readonly GraphQLField<unknown, unknown>[] | readonly Field[],
  mode: 'blind' | 'create' | 'read'
): string {
  return [
    prefix,
    ...fields.map((field) => {
      const fieldName = 'fieldName' in field ? field.fieldName : field.name;
      const isDateType = 'isDateType' in field ? field.isDateType : false;
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
      return `\${${marshallField(fieldName, isDateType)}}`;
    }),
  ].join('#');
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
  if (isDateType) {
    if (isRequired) {
      out = `new Date(${out})`;
    } else {
      out = `${out} ? new Date(${out}) : null`;
    }
  }

  return `${fieldName}: ${out}`;
}
