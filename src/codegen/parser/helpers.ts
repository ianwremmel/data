import assert from 'assert';

import type {
  ConstDirectiveNode,
  FieldDefinitionNode,
  GraphQLField,
  GraphQLObjectType,
  ObjectTypeDefinitionNode,
} from 'graphql';
import {isNonNullType, isScalarType} from 'graphql';

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
  nodeOrType:
    | FieldDefinitionNode
    | ObjectTypeDefinitionNode
    | GraphQLObjectType
    | GraphQLField<unknown, unknown>
): ConstDirectiveNode | undefined {
  if ('getFields' in nodeOrType) {
    assert(nodeOrType.astNode, 'Expected type to have an AST node');
    nodeOrType = nodeOrType.astNode;
  }

  if ('astNode' in nodeOrType) {
    assert(nodeOrType.astNode);
    return nodeOrType.astNode.directives?.find((d) => d.name.value === name);
  }
  return nodeOrType.directives?.find((d) => d.name.value === name);
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
