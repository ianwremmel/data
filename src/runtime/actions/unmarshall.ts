import {assert} from '../assert';
import {DataIntegrityError} from '../errors';

/** identify function */
function identity<T>(x: T): T {
  return x;
}

/** helper */
function unmarshallRawRequiredValue<T, R>(
  value: T,
  columnName: string,
  transform: (value: T) => R
) {
  assert(
    value !== null,
    () => new DataIntegrityError(`Expected ${columnName} to be non-null`)
  );
  assert(
    typeof value !== 'undefined',
    () => new DataIntegrityError(`Expected ${columnName} to be defined`)
  );
  return transform(value);
}

/**
 * unmarshalls a required field, first trying it's column name, then trying its
 * camelCase name, and finally, its explicit snake_case name
 **/
export function unmarshallRequiredField(
  item: Record<string, any>,
  fieldName: string,
  possibleColumnNames: readonly string[],
  transform: (value: any) => any = identity
) {
  for (const name of possibleColumnNames) {
    if (name in item) {
      return unmarshallRawRequiredValue(item[name], name, transform);
    }
  }

  // special case for version, which could be absent if we adopted a table that
  // wasn't versioned
  if (fieldName === 'version') {
    return undefined;
  }

  throw new DataIntegrityError(`Expected ${fieldName} to be defined`);
}

/**
 * unmarshalls an optional field, first trying it's column name, then trying its
 * camelCase name, and finally, its explicit snake_case name
 */
export function unmarshallOptionalField(
  item: Record<string, any>,
  /**
   * fieldName isn't used here, but keeping this function consistent with
   * unmarshallRequiredField makes other things easier
   */
  fieldName: string,
  possibleColumnNames: readonly string[],
  transform: (value: any) => any = identity
) {
  for (const name of possibleColumnNames) {
    if (name in item) {
      return transform(item[name]);
    }
  }

  return undefined;
}
