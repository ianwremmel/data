import {
  GraphQLField,
  GraphQLObjectType,
  isNonNullType,
  isScalarType,
} from 'graphql';
import {snakeCase} from 'lodash';

/** Indicates if objType contains the specified directive */
export function hasDirective(
  directiveName: string,
  objType: GraphQLObjectType
) {
  return !!objType.astNode?.directives
    ?.map(({name}) => name.value)
    .includes(directiveName);
}

/** Indicates if objType implements the specified interface */
export function hasInterface(
  interfaceName: string,
  objType: GraphQLObjectType
) {
  return !!objType.astNode?.interfaces
    ?.map(({name}) => name.value)
    .includes(interfaceName);
}

/**
 * Indicates if field is the specified type. Does not care if field is NonNull
 */
export function isType(
  typeName: string,
  fieldType: GraphQLField<unknown, unknown>
): boolean {
  let {type} = fieldType;
  if (isNonNullType(type)) {
    type = type.ofType;
  }

  return isScalarType(type) && type.name === typeName;
}

/**
 * Helper function for building a field unmarshaller
 */
export function unmarshalField(
  fieldType: GraphQLField<unknown, unknown>,
  columnNameOverride?: string
) {
  const fieldName = fieldType.name;
  const columnName = columnNameOverride ?? snakeCase(fieldType.name);

  const isDateType = isType('Date', fieldType);

  let out = `item.${columnName}`;
  if (isDateType) {
    if (isNonNullType(fieldType.type)) {
      out = `new Date(${out})`;
    } else {
      out = `${out} ? new Date(${out}) : null`;
    }
  }

  if (isNonNullType(fieldType.type)) {
    out = `(() => {
      assert(
        item.${columnName} !== null,
        () => new DataIntegrityError('Expected ${fieldName} to be non-null')
      );
      assert(
        typeof item.${columnName} !== 'undefined',
        () => new DataIntegrityError('Expected ${fieldName} to be defined')
      );
      return ${out};
    })()`;
  }

  return `${fieldName}: ${out}`;
}
