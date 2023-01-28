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
  isRequired,
}: Field): string {
  if (columnName === 'ttl') {
    return `Math.floor(input.${fieldName}.getTime()/1000)`;
  }

  if (isDateType) {
    if (isRequired) {
      return `input.${fieldName}.toISOString()`;
    }
    return `input.${fieldName}?.toISOString()`;
  }
  return `input.${fieldName}`;
}

/** Generates the template for producing the desired primary key or index column */
export function makeKeyTemplate(
  prefix: string | undefined,
  fields: readonly Field[],
  mode: 'blind' | 'create' | 'read'
): string {
  const accessors = [
    ...(prefix ? [`'${prefix}'`] : []),
    ...fields.map((field) => {
      const {fieldName} = field;
      if (fieldName === 'createdAt') {
        if (mode === 'blind') {
          return "'createdAt' in input && typeof input.createdAt !== 'undefined' ? input.createdAt.getTime() : now.getTime()";
        }
        if (mode === 'create') {
          return 'now.getTime()';
        }
        if (mode === 'read') {
          return 'input.createdAt.getTime()';
        }
        assert.fail('Invalid mode');
      }
      if (fieldName === 'updatedAt') {
        // this template gets passed through so it's available in the output.
        // eslint-disable-next-line no-template-curly-in-string
        return 'now.getTime()';
      }
      // The create template sets a local variable "publicId" so we only
      // generate it once for both the Key and ExpressionAttributeValues.
      if (fieldName === 'publicId') {
        if (mode === 'create') {
          // this template gets passed through so it's available in the output.
          // eslint-disable-next-line no-template-curly-in-string
          return 'publicId';
        }
      }
      return marshallField(field);
    }),
  ].filter(filterNull);

  return `[${accessors.join(', ')}].join('#')`;
}

/** Converts a compile time object to a runtime object */
export function objectToString(obj: Record<string, string>): string {
  return `{${Object.entries(obj).map(([k, value]) => `${k}: ${value}`)}}`;
}

/** helper */
function getTransformString(field: Field): string {
  if (field.columnName === 'ttl') {
    return '(v) => new Date(v * 1000)';
  }

  if (field.isDateType) {
    return '(v) => new Date(v)';
  }

  return '';
}

/**
 * Helper function for building a field unmarshaller
 */
export function unmarshallFieldValue(field: Field): string {
  const transformString = getTransformString(field);

  const func = field.isRequired
    ? 'unmarshallRequiredField'
    : 'unmarshallOptionalField';

  const args = [
    'item',
    `'${field.fieldName}'`,
    `[${field.columnNamesForRead.map((c) => `'${c}'`).join(',')}]`,
    transformString,
  ];

  return `${func}(${args.join(', ')})`;
}

/**
 * Helper function for building a field unmarshaller
 */
export function unmarshallField(field: Field) {
  const out = unmarshallFieldValue(field);

  return `${field.fieldName}: ${out}`;
}
