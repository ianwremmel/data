import assert from 'assert';

import type {
  ConstDirectiveNode,
  GraphQLField,
  GraphQLObjectType,
} from 'graphql';
import {isNonNullType, isScalarType} from 'graphql';

import {
  getArgFieldTypeValues,
  getDirective,
  getOptionalArgStringValue,
  hasDirective,
  marshalField,
} from './helpers';
import type {PrimaryIndex} from './indexes';

export const DIVIDER = '#:#';

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
  readonly index?: PrimaryIndex;
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

  assert(
    !fieldNames.includes('id'),
    'id is a reserved field and cannot be part of the partition key'
  );

  return {
    conditionField: 'pk',
    ean: [`'#pk': 'pk'`],
    fields: new Set(['pk', 'sk', 'id'].filter(Boolean)),
    index: {
      pkFields,
      pkPrefix,
      skFields,
      skPrefix,
    },
    inputToPrimaryKey: fieldNames.map((f) => `${f}: input.${f}`),
    keyForCreate: [`pk: \`${pkTemplate}\``, `sk: \`${skTemplate}\``],
    keyForReadAndUpdate: [`pk: \`${pkTemplate}\``, `sk: \`${skTemplate}\``],
    omitForCreate: ['id'].filter(Boolean),
    primaryKeyType: fieldNames.map((fieldName) =>
      mapFieldToPrimaryKeyType(fields[fieldName])
    ),
    unmarshall: [
      `id: Base64.encode(\`${type.name}:\${item.pk}${DIVIDER}\${item.sk}\`)`,
    ].filter(Boolean),
  };
}

/**
 * Returns the partition key info for the given object type.
 */
function extractPartitionKeyInfo(
  type: GraphQLObjectType,
  directive: ConstDirectiveNode
): KeyInfo {
  const pkFields = getArgFieldTypeValues('pkFields', type, directive);
  const pkPrefix = getOptionalArgStringValue('pkPrefix', directive);

  const pkTemplate = makeKeyTemplate(pkPrefix, pkFields);

  const fieldNames = pkFields.map((f) => f.name).sort();

  const fields = type.getFields();

  assert(
    !fieldNames.includes('id'),
    'id is a reserved field and cannot be part of the partition key'
  );

  return {
    conditionField: 'pk',
    ean: [`'#pk': 'pk'`],
    fields: new Set(['pk', 'id'].filter(Boolean)),
    index: {
      pkFields,
      pkPrefix,
    },
    inputToPrimaryKey: fieldNames.map((f) => `${f}: input.${f}`),
    keyForCreate: [`pk: \`${pkTemplate}\``],
    keyForReadAndUpdate: [`pk: \`${pkTemplate}\``],
    omitForCreate: ['id'],
    primaryKeyType: fieldNames.map((fieldName) =>
      mapFieldToPrimaryKeyType(fields[fieldName])
    ),
    unmarshall: [`id: Base64.encode(\`${type.name}:\${item.pk}\`)`],
  };
}

/**
 * Parses out a types key fields and generates the necessary code for
 * marshalling/unmarshalling them.
 */
export function extractKeyInfo(type: GraphQLObjectType): KeyInfo {
  if (hasDirective('compositeKey', type)) {
    return extractCompositeKeyInfo(type, getDirective('compositeKey', type));
  }

  if (hasDirective('partitionKey', type)) {
    return extractPartitionKeyInfo(type, getDirective('partitionKey', type));
  }

  assert.fail(
    `Expected type ${type.name} to have a @partitionKey or @compositeKey directive`
  );
}

/** helper */
function mapFieldToPrimaryKeyType(
  field: GraphQLField<unknown, unknown>
): string {
  if (isNonNullType(field.type)) {
    if (isScalarType(field.type.ofType)) {
      return `${field.name}: Scalars['${field.type.ofType}'];`;
    }

    return `${field.name}: ${field.type.ofType};`;
  }

  if (isScalarType(field.type)) {
    return `${field.name}?: Maybe<Scalars['${field.type}']>;`;
  }

  return `${field.name}?: Maybe<${field.type}>;`;
}
