import assert from 'assert';

import {isNonNullType, isScalarType} from 'graphql';
import {ConstDirectiveNode, GraphQLObjectType} from 'graphql/index';

import {hasInterface, unmarshalField} from './helpers';

export interface KeyInfo {
  readonly conditionField: string;
  readonly ean: readonly string[];
  readonly fields: Set<string>;
  readonly inputToPrimaryKey: readonly string[];
  readonly keyForCreate: readonly string[];
  readonly keyForReadAndUpdate: readonly string[];
  readonly omitForCreate: readonly string[];
  readonly primaryKeyType: readonly string[];
  readonly unmarshall: readonly string[];
}

/**
 * Returns the composite key info for the given object type.
 */
function extractCompositeKeyInfo(
  type: GraphQLObjectType,
  directive: ConstDirectiveNode
): KeyInfo {
  const isNode = hasInterface('Node', type);

  const pkFields = directive.arguments?.find(
    (arg) => arg.name.value === 'pkFields'
  );
  assert(pkFields, 'pkFields argument is required');
  assert(pkFields.value.kind === 'ListValue');
  const pkFieldNames = pkFields.value.values.map((v) => {
    assert(v.kind === 'StringValue');
    return v.value;
  });

  const pkPrefix = directive.arguments?.find(
    (arg) => arg.name.value === 'pkPrefix'
  );

  const skFields = directive.arguments?.find(
    (arg) => arg.name.value === 'skFields'
  );
  assert(skFields, 'skFields argument is required');
  assert(skFields.value.kind === 'ListValue');
  const skFieldNames = skFields.value.values.map((v) => {
    assert(v.kind === 'StringValue');
    return v.value;
  });

  const skPrefix = directive.arguments?.find(
    (arg) => arg.name.value === 'skPrefix'
  );

  const pkPrefixValue =
    pkPrefix?.value.kind === 'StringValue' ? pkPrefix.value.value : '';
  const skPrefixValue =
    skPrefix?.value.kind === 'StringValue' ? skPrefix.value.value : '';

  const pkTemplate = [
    pkPrefixValue,
    ...pkFieldNames.map((field) => `\${input.${field}}`),
  ].join('#');

  const skTemplate = [
    skPrefixValue,
    ...skFieldNames.map((field) => `\${input.${field}}`),
  ].join('#');

  const fieldNames = [...pkFieldNames, ...skFieldNames].sort();

  const fields = type.getFields();

  return {
    conditionField: 'pk',
    ean: [`'#pk': 'pk'`],
    fields: new Set(['pk', 'sk', isNode ? 'id' : ''].filter(Boolean)),
    inputToPrimaryKey: fieldNames.map((f) => `${f}: input.${f}`),
    keyForCreate: [`pk: \`${pkTemplate}\``, `sk: \`${skTemplate}\``],
    keyForReadAndUpdate: [`pk: \`${pkTemplate}\``, `sk: \`${skTemplate}\``],
    omitForCreate: [isNode ? 'id' : ''].filter(Boolean),
    primaryKeyType: fieldNames.map((fieldName) => {
      const field = fields[fieldName];

      if (isNonNullType(field.type)) {
        if (isScalarType(field.type.ofType)) {
          return `${fieldName}: Scalars['${field.type.ofType}'];`;
        }

        return `${fieldName}: ${field.type.ofType};`;
      }

      if (isScalarType(field.type)) {
        return `${fieldName}: Scalars['${field.type}'];`;
      }

      return `${fieldName}: ${field.type};`;
    }),
    // The embedded template is intentional.
    // eslint-disable-next-line no-template-curly-in-string
    unmarshall: [isNode ? 'id: `${item.pk}#${item.sk}`' : ''].filter(Boolean),
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
    primaryKeyType: [`id: Scalars['ID']`],
    unmarshall: [unmarshalField(type.getFields().id)],
  };
}
