import assert from 'assert';

import {ConstDirectiveNode, GraphQLObjectType} from 'graphql/index';

import {unmarshalField} from './helpers';

export interface KeyInfo {
  readonly conditionField: string;
  readonly ean: readonly string[];
  readonly fields: Set<string>;
  readonly inputToPrimaryKey: readonly string[];
  readonly keyForCreate: readonly string[];
  readonly keyForReadAndUpdate: readonly string[];
  readonly omitForCreate: readonly string[];
  readonly unmarshall: readonly string[];
}

/**
 * Returns the composite key info for the given object type.
 */
function extractCompositeKeyInfo(
  type: GraphQLObjectType,
  directive: ConstDirectiveNode
): KeyInfo {
  return {
    conditionField: 'pk',
    ean: [],
    fields: new Set([]),
    inputToPrimaryKey: [],
    keyForCreate: [],
    keyForReadAndUpdate: [],
    omitForCreate: [],
    unmarshall: [],
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
    conditionField: field,
    ean: [`'#${field}': '${field}'`],
    fields: new Set([field]),
    inputToPrimaryKey: [`${field}: input.${field}`],
    keyForCreate: [`${field}: \`${type.name}#\${uuidv4()}\``],
    keyForReadAndUpdate: [`${field}: input.${field}`],
    omitForCreate: [field],
    unmarshall: [unmarshalField(type.getFields().id)],
  };
}
