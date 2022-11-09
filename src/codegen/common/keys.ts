import assert from 'assert';

import {ConstDirectiveNode, GraphQLObjectType} from 'graphql/index';

export interface KeyInfo {
  readonly fields: Set<string>;
  readonly omitForCreate: readonly string[];
  readonly keyForCreate: Record<string, string>;
  readonly keyForReadAndUpdate: Record<string, string>;
}

/**
 * Returns the composite key info for the given object type.
 */
function extractCompositeKeyInfo(
  type: GraphQLObjectType,
  directive: ConstDirectiveNode
): KeyInfo {
  return {
    fields: new Set([]),
    keyForCreate: {},
    keyForReadAndUpdate: {},
    omitForCreate: [],
  };
}

/**
 * Parses out a types key fields and generates the necessary code for
 * marshalling/unmarshalling them.
 */
export function extractKeyInfo(type: GraphQLObjectType): KeyInfo {
  const directive = type.astNode?.directives?.find(
    (d) => d.name.value === 'autoKey' || d.name.value === 'compositeKey'
  );

  assert(
    directive,
    `Expected type ${type.name} to have an @autoKey or @compositeKey directive`
  );

  if (directive.name.value === 'compositeKey') {
    return extractCompositeKeyInfo(type, directive);
  }

  assert(directive.arguments, `Expected @autoKey directive to have arguments`);
  const directiveField = directive.arguments.find(
    (a) => a.name.value === 'field'
  );
  assert(
    directiveField,
    `Expected @autoKey directive to have argument "fields"`
  );

  const field =
    directiveField.value.kind === 'StringValue' && directiveField.value.value;
  assert(field, `Expected @autoKey directive to have argument "field"`);

  return {
    fields: new Set([field]),
    keyForCreate: {
      [field]: `id: \`${type.name}#\${uuidv4()}\``,
    },
    keyForReadAndUpdate: {
      [field]: `${field}: input.${field}`,
    },
    omitForCreate: [field],
  };
}
