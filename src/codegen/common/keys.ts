import assert from 'assert';

import type {
  ConstDirectiveNode,
  GraphQLField,
  GraphQLObjectType,
} from 'graphql';
import {isNonNullType, isScalarType} from 'graphql';

import type {Field} from '../parser';

import {
  getArgFieldTypeValues,
  getDirective,
  getOptionalArgStringValue,
  hasDirective,
  marshalField,
} from './helpers';
import type {PrimaryIndex} from './indexes';

/** Generates the template for producing the desired primary key or index column */
export function makeKeyTemplate(
  prefix: string,
  fields: readonly GraphQLField<unknown, unknown>[] | readonly Field[]
): string {
  return [
    prefix,
    ...fields.map((field) => {
      const fieldName = 'fieldName' in field ? field.fieldName : field.name;
      const isDateType = 'isDateType' in field ? field.isDateType : false;
      if (fieldName === 'createdAt' || fieldName === 'updatedAt') {
        // this template gets passed through so it's available in the output.
        // eslint-disable-next-line no-template-curly-in-string
        return '${now.getTime()}';
      }
      return `\${${marshalField(fieldName, isDateType)}}`;
    }),
  ].join('#');
}

export interface KeyInfo {
  readonly index?: PrimaryIndex;
  readonly primaryKeyType: readonly string[];
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
    index: {
      pkFields,
      pkPrefix,
      skFields,
      skPrefix,
    },
    primaryKeyType: fieldNames.map((fieldName) =>
      mapFieldToPrimaryKeyType(fields[fieldName])
    ),
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

  const fieldNames = pkFields.map((f) => f.name).sort();

  const fields = type.getFields();

  assert(
    !fieldNames.includes('id'),
    'id is a reserved field and cannot be part of the partition key'
  );

  return {
    index: {
      pkFields,
      pkPrefix,
    },
    primaryKeyType: fieldNames.map((fieldName) =>
      mapFieldToPrimaryKeyType(fields[fieldName])
    ),
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
