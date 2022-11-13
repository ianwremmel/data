import assert from 'assert';

import {
  ConstDirectiveNode,
  FieldDefinitionNode,
  GraphQLField,
  GraphQLObjectType,
  isNonNullType,
  isScalarType,
  ObjectTypeDefinitionNode,
  isListType,
} from 'graphql';
import {snakeCase} from 'lodash';

/** Gets the specified argument from the given directive. */
export function getArg(name: string, directive: ConstDirectiveNode) {
  assert(
    directive.arguments,
    `Expected @${directive} directive to have arguments`
  );
  const arg = directive.arguments?.find((a) => a.name.value === name);
  assert(arg, `${name} argument is required`);
  return arg;
}

/** Gets the specified argument from the given directive. */
export function getOptionalArg(name: string, directive: ConstDirectiveNode) {
  return directive.arguments?.find((arg) => arg.name.value === name);
}

/**
 * Gets the string value of the specified argument from the given directive.
 * Returns an empty string if the argument is not present.
 */
export function getOptionalArgStringValue(
  fieldName: string,
  directive: ConstDirectiveNode
): string {
  const prefixArg = getOptionalArg(fieldName, directive);
  if (!prefixArg) {
    return '';
  }
  assert(
    prefixArg.value.kind === 'StringValue',
    `Expected @${directive.name.value} directive argument "${fieldName}" to be a string, but got ${prefixArg.value.kind}`
  );

  return prefixArg.value.value;
}

/**
 * Given a field name that identifies a list argument, returns the typescript
 * types identified by those strings.
 */
export function getArgFieldTypeValues(
  fieldName: string,
  type: GraphQLObjectType,
  directive: ConstDirectiveNode
) {
  const arg = getArg(fieldName, directive);
  assert(arg.value.kind === 'ListValue', `Expected ${fieldName} to be a list`);
  return arg.value.values.map((v) => {
    assert(
      v.kind === 'StringValue',
      `Expected @${directive.name.value} directive argument "${fieldName}" to be a list of strings`
    );

    const field = type.getFields()[v.value];

    assert(
      field,
      `Expected @${directive.name.value} argument "${fieldName}" entry ${v.value} to identify a field on ${type.name}`
    );

    return field;
  });
}

/** Gets the specified directive from the given field. */
export function getDirective(
  name: string,
  nodeOrType: FieldDefinitionNode | ObjectTypeDefinitionNode | GraphQLObjectType
): ConstDirectiveNode {
  if ('getFields' in nodeOrType) {
    assert(nodeOrType.astNode, 'Expected type to have an AST node');
    nodeOrType = nodeOrType.astNode;
  }
  const directive = nodeOrType.directives?.find((d) => d.name.value === name);
  assert(
    directive,
    `Expected field ${nodeOrType.name.value} to have an @${name} directive`
  );
  return directive;
}

/** Gets the TypeScript type for that corresponds to the field. */
export function getTypeScriptTypeForField(
  field: GraphQLField<unknown, unknown>
): string {
  let fieldType = field.type;
  if (isNonNullType(fieldType)) {
    fieldType = fieldType.ofType;
  }

  if (isScalarType(fieldType)) {
    return `Scalars['${fieldType.name}']`;
  }

  assert(!isListType(fieldType), 'List types are not supported');

  return fieldType.name;
}

/** Indicates if objType contains the specified directive */
export function hasDirective(
  directiveName: string,
  objType: GraphQLObjectType | GraphQLField<unknown, unknown>
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
 * Marshals the specified field value for use with ddb.
 */
export function marshalField(field: GraphQLField<unknown, unknown>): string {
  const fieldName = field.name;

  const str = isType('Date', field)
    ? `input.${fieldName}.getTime()`
    : `input.${fieldName}`;

  if (!isNonNullType(field.type)) {
    // I'm not completely confident the following is correct or accurate, but
    // the idea is to explicitly handle each of the three cases for defined,
    // undefined, and null. If a value is defined, just use it. If it's null, we
    // intend to unset it. if it's undefined, we don't want to do anything. wit
    // it.
    return `input.${fieldName} === null ? null : typeof input.${fieldName} === 'undefined' ? undefined : ${str}`;
  }

  return str;
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
