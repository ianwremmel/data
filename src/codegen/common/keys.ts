import assert from 'assert';

import {
  ConstDirectiveNode,
  GraphQLField,
  GraphQLObjectType,
  isNonNullType,
  isScalarType,
} from 'graphql';

import {
  getArg,
  getArgFieldTypeValues,
  getOptionalArgStringValue,
  hasInterface,
  marshalField,
  unmarshalField,
} from './helpers';
import {IndexFieldInfo} from './indexes';

/** Generates the template for producing the desired primary key or index column */
export function makeKeyTemplate(
  prefix: string,
  fields: readonly GraphQLField<unknown, unknown>[]
): string {
  return [
    prefix,
    ...fields.map((field) => {
      if (field.name === 'createdAt' || field.name === 'updatedAt') {
        // this template gets passed through so it's available in the output.
        // eslint-disable-next-line no-template-curly-in-string
        return '${now.getTime()}';
      }
      return `\${${marshalField(field)}}`;
    }),
  ].join('#');
}

export interface KeyInfo {
  readonly conditionField: string;
  readonly ean: readonly string[];
  readonly index?: IndexFieldInfo;
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

  const pkFields = getArgFieldTypeValues('pkFields', type, directive);
  const skFields = getArgFieldTypeValues('skFields', type, directive);
  const pkPrefix = getOptionalArgStringValue('pkPrefix', directive);
  const skPrefix = getOptionalArgStringValue('skPrefix', directive);

  const pkTemplate = makeKeyTemplate(pkPrefix, pkFields);
  const skTemplate = makeKeyTemplate(skPrefix, skFields);

  const fieldNames = [
    ...pkFields.map((f) => f.name),
    ...skFields.map((f) => f.name),
  ].sort();

  const fields = type.getFields();

  return {
    conditionField: 'pk',
    ean: [`'#pk': 'pk'`],
    fields: new Set(['pk', 'sk', isNode ? 'id' : ''].filter(Boolean)),
    index: {
      pkFields,
      pkPrefix,
      skFields,
      skPrefix,
    },
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

  const directiveField = getArg('field', directive);

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
