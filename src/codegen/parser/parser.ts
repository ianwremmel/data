import assert from 'assert';
import path from 'path';

import type {Types} from '@graphql-codegen/plugin-helpers/typings/types';
import type {GraphQLObjectType, GraphQLSchema} from 'graphql';
import {assertObjectType, isNonNullType, isObjectType} from 'graphql';
import {snakeCase} from 'lodash';

import {getAliasForField} from '../common/fields';
import {
  getArgStringArrayValue,
  getArgStringValue,
  getDirective,
  getOptionalArgBooleanValue,
  getOptionalArgStringValue,
  getOptionalDirective,
  hasDirective,
  hasInterface,
  isType,
} from '../common/helpers';

import {extractChangeDataCaptureConfig} from './extractors/cdc';
import type {
  Field,
  PrimaryKeyConfig,
  SecondaryIndex,
  Table,
  TTLConfig,
} from './types';

export interface Info {
  [key: string]: unknown;
  outputFile?: string;
  allPlugins?: Types.ConfiguredPlugin[];
  pluginContext?: {
    [key: string]: unknown;
  };
}

/**
 * Reads a set of GraphQL Schema files and produces an Intermediate
 * Representation.
 */
export function parse<T extends {dependenciesModuleId: string}>(
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: T,
  info?: Info
): readonly Table[] {
  const outputFile = info?.outputFile;
  assert(outputFile, 'outputFile is required');

  const typesMap = schema.getTypeMap();
  return Object.keys(typesMap)
    .filter((typeName) => {
      const type = schema.getTypeMap()[typeName];
      return isObjectType(type) && hasInterface('Model', type);
    })
    .map((typeName) => {
      const type = assertObjectType(typesMap[typeName]);
      const fields = extractFields(type);
      const fieldMap: Record<string, Field> = Object.fromEntries(
        fields.map((field) => [field.fieldName, field] as const)
      );

      return {
        changeDataCaptureConfig: extractChangeDataCaptureConfig(
          schema,
          type,
          config,
          outputFile
        ),
        consistent: hasDirective('consistent', type),
        dependenciesModuleId: path.relative(
          path.resolve(process.cwd(), path.dirname(outputFile)),
          path.resolve(process.cwd(), config.dependenciesModuleId)
        ),
        fields,
        libImportPath: '@ianwremmel/data',
        primaryKey: extractPrimaryKey(type, fieldMap),
        secondaryIndexes: extractSecondaryIndexes(type),
        tableName: extractTableName(type),
        ttlConfig: extractTTLConfig(type),
        typeName: type.name,
        ...extractTableInfo(type),
      };
    });
}

/** helper */
function extractFields(
  type: GraphQLObjectType<unknown, unknown>
): readonly Field[] {
  const fields = type.getFields();
  return Object.keys(fields).map((fieldName) => {
    const field = fields[fieldName];
    return {
      columnName: getAliasForField(field) ?? snakeCase(fieldName),
      ean: `:${fieldName}`,
      eav: `#${fieldName}`,
      fieldName,
      isDateType: isType('Date', field),
      isRequired: isNonNullType(field.type),
    };
  });
}

/** helper */
function extractPrimaryKey(
  type: GraphQLObjectType<unknown, unknown>,
  fieldMap: Record<string, Field>
): PrimaryKeyConfig {
  if (hasDirective('compositeKey', type)) {
    const directive = getDirective('compositeKey', type);

    return {
      isComposite: true,
      partitionKeyFields: getArgStringArrayValue('pkFields', directive).map(
        (fieldName) => fieldMap[fieldName]
      ),
      partitionKeyPrefix: getOptionalArgStringValue('pkPrefix', directive),
      sortKeyFields: getArgStringArrayValue('skFields', directive).map(
        (fieldName) => fieldMap[fieldName]
      ),
      sortKeyPrefix: getOptionalArgStringValue('skPrefix', directive),
    };
  }

  if (hasDirective('partitionKey', type)) {
    const directive = getDirective('partitionKey', type);

    return {
      fields: getArgStringArrayValue('pkFields', directive).map(
        (fieldName) => fieldMap[fieldName]
      ),
      isComposite: false,
      prefix: getOptionalArgStringValue('pkPrefix', directive),
    };
  }

  assert.fail(
    `Expected type ${type.name} to have a @partitionKey or @compositeKey directive`
  );
}

/** helper */
function extractSecondaryIndexes(
  type: GraphQLObjectType<unknown, unknown>
): SecondaryIndex[] {
  return (
    type.astNode?.directives
      ?.filter(
        (directive) =>
          directive.name.value === 'compositeIndex' ||
          directive.name.value === 'secondaryIndex'
      )
      .map((directive) => ({
        isComposite: directive.name.value === 'compositeIndex',
        name: getArgStringValue('name', directive),
        type: directive.name.value === 'compositeIndex' ? 'gsi' : 'lsi',
      })) ?? []
  );
}

/**
 * Determines table in which a particular Model should be stored.
 */
export function extractTableName(type: GraphQLObjectType): string {
  const directive = getOptionalDirective('table', type);
  if (directive) {
    const value = getOptionalArgStringValue('name', directive);
    if (value) {
      return value;
    }
  }
  return `Table${type.name}`;
}

/** helper */
function extractTableInfo(type: GraphQLObjectType<unknown, unknown>) {
  const tableDirective = getOptionalDirective('table', type);

  return {
    enablePointInTimeRecovery: tableDirective
      ? getOptionalArgBooleanValue(
          'enablePointInTimeRecovery',
          tableDirective
        ) !== false
      : true,
  };
}

/**
 * Determines TTL configuration for a particular Model.
 */
function extractTTLConfig(
  type: GraphQLObjectType<unknown, unknown>
): TTLConfig | undefined {
  const fields =
    type.astNode?.fields?.filter((field) =>
      field.directives?.map(({name}) => name.value).includes('ttl')
    ) ?? [];
  if (fields.length === 0) {
    return undefined;
  }
  assert(fields.length === 1, 'Only one field can be marked with @ttl');
  const [field] = fields;
  const fieldName = field.name.value;
  const directive = getDirective('ttl', field);
  const duration = getOptionalArgStringValue('duration', directive);

  const durationUnit = duration?.slice(-1);
  const durationValue = duration?.slice(0, -1);

  switch (durationUnit) {
    case 's':
      return {duration: Number(durationValue) * 1000, fieldName};
    case 'm':
      return {duration: Number(durationValue) * 1000 * 60, fieldName};
    case 'h':
      return {duration: Number(durationValue) * 1000 * 60 * 60, fieldName};
    case 'd':
      return {
        duration: Number(durationValue) * 1000 * 60 * 60 * 24,
        fieldName,
      };
    default:
      throw new Error(
        `Invalid ttl duration: ${duration}. Unit must be one of s, m, h, d`
      );
  }
}
