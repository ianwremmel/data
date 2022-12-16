import assert from 'assert';

import type {
  ConstDirectiveNode,
  FieldDefinitionNode,
  GraphQLField,
  GraphQLObjectType,
  ObjectTypeDefinitionNode,
} from 'graphql';
import {isListType, isNonNullType, isScalarType} from 'graphql';

import type {Field} from '../parser';

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
 */
export function getArgStringValue(
  fieldName: string,
  directive: ConstDirectiveNode
): string {
  const prefixArg = getArg(fieldName, directive);

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
export function getArgStringArrayValue(
  fieldName: string,
  directive: ConstDirectiveNode
): string[] {
  const arg = getArg(fieldName, directive);
  assert(arg.value.kind === 'ListValue', `Expected ${fieldName} to be a list`);
  return arg.value.values.map((v) => {
    assert(
      v.kind === 'StringValue',
      `Expected @${directive.name.value} directive argument "${fieldName}" to be a list of strings`
    );

    return v.value;
  });
}

/**
 * Gets the boolean value of the specified argument from the given directive.
 * Returns undefined
 */
export function getOptionalArgBooleanValue(
  fieldName: string,
  directive: ConstDirectiveNode
): boolean | undefined {
  const prefixArg = getOptionalArg(fieldName, directive);
  if (!prefixArg) {
    return undefined;
  }
  assert(
    prefixArg.value.kind === 'BooleanValue',
    `Expected @${directive.name.value} directive argument "${fieldName}" to be a boolean, but got ${prefixArg.value.kind}`
  );

  return Boolean(prefixArg.value.value);
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

/** Gets the specified directive from the given field. */
export function getOptionalDirective(
  name: string,
  nodeOrType: FieldDefinitionNode | ObjectTypeDefinitionNode | GraphQLObjectType
): ConstDirectiveNode | undefined {
  if ('getFields' in nodeOrType) {
    assert(nodeOrType.astNode, 'Expected type to have an AST node');
    nodeOrType = nodeOrType.astNode;
  }
  return nodeOrType.directives?.find((d) => d.name.value === name);
}

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
export function marshalField(fieldName: string, isDate: boolean): string {
  return isDate ? `input.${fieldName}.getTime()` : `input.${fieldName}`;
}

/**
 * Helper function for building a field unmarshaller
 */
export function unmarshalField({
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
