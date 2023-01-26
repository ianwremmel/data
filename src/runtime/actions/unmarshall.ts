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
  columnName: string,
  snakeCaseName: string,
  camelCaseName: string,
  transform: (value: any) => any = identity
) {
  if (columnName in item) {
    return unmarshallRawRequiredValue(item[columnName], columnName, transform);
  }

  if (camelCaseName in item) {
    return unmarshallRawRequiredValue(
      item[camelCaseName],
      columnName,
      transform
    );
  }

  if (snakeCaseName in item) {
    return unmarshallRawRequiredValue(
      item[snakeCaseName],
      columnName,
      transform
    );
  }

  throw new DataIntegrityError(`Expected ${columnName} to be defined`);
}

/**
 * unmarshalls an optional field, first trying it's column name, then trying its
 * camelCase name, and finally, its explicit snake_case name
 */
export function unmarshallOptionalField(
  item: Record<string, any>,
  columnName: string,
  snakeCaseName: string,
  camelCaseName: string,
  transform: (value: any) => any = identity
) {
  if (columnName in item) {
    return transform(item[columnName]);
  }

  if (camelCaseName in item) {
    return transform(item[camelCaseName]);
  }

  if (snakeCaseName in item) {
    return transform(item[snakeCaseName]);
  }

  return null;
}
