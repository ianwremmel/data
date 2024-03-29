import assert from 'assert';

import type {Types} from '@graphql-codegen/plugin-helpers/typings/types';
import type {
  ConstDirectiveNode,
  GraphQLField,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';
import {
  assertObjectType,
  isNonNullType,
  isObjectType,
  isScalarType,
} from 'graphql';
import {camelCase, snakeCase} from 'lodash';

import {filterNull} from '../common/filters';
import {resolveDependenciesModuleId} from '../common/paths';

import {extractChangeDataCaptureConfig} from './extractors/cdc';
import {
  getArgStringArrayValue,
  getArgStringValue,
  getDirective,
  getOptionalArg,
  getOptionalArgBooleanValue,
  getOptionalArgStringValue,
  getOptionalDirective,
  hasDirective,
  hasInterface,
  isType,
} from './helpers';
import type {
  BaseTable,
  DispatcherConfig,
  Field,
  GSI,
  HandlerConfig,
  IntermediateRepresentation,
  Model,
  PrimaryKeyConfig,
  SecondaryIndex,
  Table,
  TableSecondaryIndex,
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

/** helper */
function extractModel<
  CONFIG extends {
    defaultDispatcherConfig: DispatcherConfig;
    defaultHandlerConfig: HandlerConfig;
  }
>(
  config: CONFIG,
  schema: GraphQLSchema,
  dependenciesModuleId: string,
  typeName: string,
  type: GraphQLObjectType
): Model {
  const fields = extractFields(type);
  const fieldMap: Record<string, Field> = Object.fromEntries(
    fields.map((field) => [field.fieldName, field] as const)
  );

  return {
    changeDataCaptureConfig: extractChangeDataCaptureConfig(
      config,
      schema,
      type
    ),
    consistent: hasDirective('consistent', type),
    dependenciesModuleId,
    fields,
    isLedger: hasDirective('ledger', type),
    isPublicModel: hasInterface('PublicModel', type),
    libImportPath: '@ianwremmel/data',
    primaryKey: extractPrimaryKey(type, fieldMap),
    secondaryIndexes: extractSecondaryIndexes(type, fieldMap),
    tableName: extractTableName(type),
    ttlConfig: extractTTLConfig(type),
    typeName: type.name,
    ...extractTableInfo(type),
  };
}

/* eslint-disable complexity */
/** helper */
function combineDispatcherConfig(table: Table, model: Model): DispatcherConfig {
  const [cfg] = [
    'dispatcherConfig' in table && table.dispatcherConfig,
    ...(model.changeDataCaptureConfig?.map((cdc) => cdc.dispatcherConfig) ??
      []),
  ]
    .filter(filterNull)
    .map((config, index, configs) => {
      Object.keys(config).forEach((key) => {
        assert.strictEqual(
          config[key as keyof typeof config],
          configs[0][key as keyof typeof config],
          `Please check the ChangeDataCaptureConfig definitions for ${model.typeName}. All ChangeDataCaptureConfig in the same table must have the same ${key} value.`
        );
      });
      return config;
    });

  assert(cfg);

  return cfg;
}

/* eslint-enable complexity */

/** helper */
function combineTableWithModel(
  acc: Table,
  model: Model,
  dependenciesModuleId: string,
  tableName: string
): Table {
  assert.equal(
    acc.primaryKey.isComposite,
    model.primaryKey.isComposite,
    `Please check the Model definitions for ${tableName}. All Models in the same table must have the same type of primary key (either partition or composite).`
  );
  const secondaryIndexes = compareIndexes(
    tableName,
    acc.secondaryIndexes,
    model.secondaryIndexes
  );

  const baseConfig: BaseTable = {
    dependenciesModuleId,
    enablePointInTimeRecovery:
      acc.enablePointInTimeRecovery || model.enablePointInTimeRecovery,
    enableStreaming: acc.enableStreaming || model.enableStreaming,
    hasPublicModels: acc.hasPublicModels || model.isPublicModel,
    hasTtl: acc.hasTtl || !!model.ttlConfig,
    libImportPath: model.libImportPath,
    primaryKey: {
      isComposite: acc.primaryKey.isComposite,
    },
    secondaryIndexes,
    tableName,
  };

  const hasCdc = acc.hasCdc || model.changeDataCaptureConfig.length > 0;
  if (hasCdc) {
    const dispatcherConfig = combineDispatcherConfig(acc, model);
    assert(dispatcherConfig);
    return {
      ...baseConfig,
      dispatcherConfig,
      hasCdc: true,
    };
  }

  return {
    ...baseConfig,
    hasCdc: false,
  };
}

/** helper */
function extractTableFromModel(
  dependenciesModuleId: string,
  tableName: string,
  model: Model
): Table {
  const table: BaseTable = {
    dependenciesModuleId,
    enablePointInTimeRecovery: model.enablePointInTimeRecovery,
    enableStreaming: model.enableStreaming,

    hasPublicModels: model.isPublicModel,
    hasTtl: !!model.ttlConfig,
    libImportPath: model.libImportPath,
    primaryKey: {
      isComposite: model.primaryKey.isComposite,
    },
    secondaryIndexes: model.secondaryIndexes.map(
      ({isComposite, name, type, projectionType, ...rest}) => ({
        isComposite,
        isSingleField: 'isSingleField' in rest ? rest.isSingleField : false,
        name,
        projectionType,
        type,
      })
    ),
    tableName,
  };

  const hasCdc = model.changeDataCaptureConfig.length > 0;
  if (hasCdc) {
    const dispatcherConfig = combineDispatcherConfig(
      {...table, hasCdc: false},
      model
    );
    assert(dispatcherConfig);
    return {
      ...table,
      dispatcherConfig,
      hasCdc: true,
    };
  }

  return {
    ...table,
    hasCdc: false,
  };
}

/**
 * Reads a set of GraphQL Schema files and produces an Intermediate
 * Representation.
 */
export function parse<
  T extends {
    defaultDispatcherConfig: DispatcherConfig;
    defaultHandlerConfig: HandlerConfig;
    dependenciesModuleId: string;
  }
>(
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: T,
  info?: Info
): IntermediateRepresentation {
  const outputFile = info?.outputFile;
  assert(outputFile, 'outputFile is required');

  const dependenciesModuleId = resolveDependenciesModuleId(
    outputFile,
    config.dependenciesModuleId
  );

  const typesMap = schema.getTypeMap();
  const models: Model[] = Object.keys(typesMap)
    .filter((typeName) => {
      const type = schema.getTypeMap()[typeName];
      return isObjectType(type) && hasInterface('Model', type);
    })
    .map((typeName) =>
      extractModel(
        config,
        schema,
        dependenciesModuleId,
        typeName,
        assertObjectType(typesMap[typeName])
      )
    );

  const tables: Table[] = Array.from(
    models
      .reduce((acc, model) => {
        const set = acc.get(model.tableName) ?? new Set();
        set.add(model);
        acc.set(model.tableName, set);
        return acc;
      }, new Map<string, Set<Model>>())
      .entries()
  )
    .map(
      ([tableName, tableModels]) =>
        [tableName, Array.from(tableModels)] as const
    )
    .map(([tableName, [firstModel, ...tableModels]]) => {
      return tableModels.reduce(
        (acc, model) =>
          combineTableWithModel(acc, model, dependenciesModuleId, tableName),
        extractTableFromModel(dependenciesModuleId, tableName, firstModel)
      );
    });

  return {
    additionalImports: models
      .flatMap((model) => model.fields.map((field) => field.computeFunction))
      .filter(filterNull),
    dependenciesModuleId,
    models,
    tables,
  };
}

/** helper */
function compareIndexes(
  tableName: string,
  tableIndexes: readonly TableSecondaryIndex[],
  modelIndexes: readonly SecondaryIndex[]
): TableSecondaryIndex[] {
  const tableIndexMap = new Map<string, TableSecondaryIndex>(
    tableIndexes.map((t) => [t.name, t])
  );

  const modelIndexMap = new Map<string, SecondaryIndex>(
    modelIndexes.map((m) => [m.name, m])
  );

  const long =
    tableIndexMap.size > modelIndexMap.size ? tableIndexMap : modelIndexMap;
  const short =
    tableIndexMap.size > modelIndexMap.size ? modelIndexMap : tableIndexMap;

  for (const [name, index] of short.entries()) {
    const longIndex = long.get(name);
    if (longIndex) {
      assert.equal(
        index.isComposite,
        longIndex.isComposite,
        `Please check the secondary index ${name} for the table ${tableName}. All indexes of the same name must be of the same type (either partition or composite).`
      );

      assert.equal(
        index.type,
        longIndex.type,
        `Please check the secondary index ${name} for the table ${tableName}. All indexes of the same name must be of the same type (either gsi or lsi).`
      );
      assert.equal(
        index.projectionType,
        longIndex.projectionType,
        `Please check the secondary index ${name} for the table ${tableName}. All indexes of the same name must be of the same projection type (either "all"" or "keys_only").`
      );
    } else {
      long.set(name, index);
    }
  }

  return Array.from(long.values());
}

/** helper */
function extractFields(
  type: GraphQLObjectType<unknown, unknown>
): readonly Field[] {
  const fields = type.getFields();
  return Object.keys(fields).map((fieldName) => {
    const field = fields[fieldName];
    const computed = getOptionalDirective('computed', field);
    const importDetails = computed
      ? {
          importName: getArgStringValue('importName', computed),
          importPath: getArgStringValue('importPath', computed),
          isVirtual: !!getOptionalArgBooleanValue('virtual', computed),
        }
      : undefined;
    return {
      columnName: getAliasForField(field, type, fieldName),
      columnNamesForRead: getReadAliasesForField(field, type, fieldName),
      computeFunction: importDetails,
      ean: `:${fieldName}`,
      eav: `#${fieldName}`,
      fieldName,
      isDateType: isType('Date', field),
      isRequired: isNonNullType(field.type),
      isScalarType: isNonNullType(field.type)
        ? isScalarType(field.type.ofType)
        : isScalarType(field.type),
      typeName: isNonNullType(field.type)
        ? String(field.type.ofType)
        : field.type.name,
    };
  });
}

/** helper */
function getFieldFromFieldMap(
  fieldMap: Record<string, Field>,
  fieldName: string
): Field {
  const field = fieldMap[fieldName];
  assert(field, `Expected field ${fieldName} to exist`);
  return field;
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
        (fieldName) => getFieldFromFieldMap(fieldMap, fieldName)
      ),
      partitionKeyPrefix: getOptionalArgStringValue('pkPrefix', directive),
      sortKeyFields: getArgStringArrayValue('skFields', directive).map(
        (fieldName) => getFieldFromFieldMap(fieldMap, fieldName)
      ),
      sortKeyPrefix: getOptionalArgStringValue('skPrefix', directive),
      type: 'primary',
    };
  }

  if (hasDirective('partitionKey', type)) {
    const directive = getDirective('partitionKey', type);

    return {
      isComposite: false,
      isSingleField: false,
      partitionKeyFields: getArgStringArrayValue('pkFields', directive).map(
        (fieldName) => getFieldFromFieldMap(fieldMap, fieldName)
      ),
      partitionKeyPrefix: getOptionalArgStringValue('pkPrefix', directive),
      type: 'primary',
    };
  }

  assert.fail(
    `Expected type ${type.name} to have a @partitionKey or @compositeKey directive`
  );
}

/** helper */
function getProjectionType(directive: ConstDirectiveNode): 'all' | 'keys_only' {
  const arg = getOptionalArg('projection', directive);
  if (!arg) {
    return 'all';
  }

  assert(
    arg.value.kind === 'EnumValue',
    `Expected projection to be an enum value`
  );
  const type = arg.value.value.toLowerCase();

  assert(
    type === 'all' || type === 'keys_only',
    `Invalid projection type ${type}`
  );
  return type;
}

/** helper */
function extractSecondaryIndexes(
  type: GraphQLObjectType<unknown, unknown>,
  fieldMap: Record<string, Field>
): SecondaryIndex[] {
  const indexes: SecondaryIndex[] =
    type.astNode?.directives
      ?.filter(
        (directive) =>
          directive.name.value === 'compositeIndex' ||
          directive.name.value === 'secondaryIndex' ||
          directive.name.value === 'simpleIndex'
      )
      .map((directive) => {
        if (directive.name.value === 'compositeIndex') {
          return {
            isComposite: true,
            isSingleField: false,
            name: getArgStringValue('name', directive),
            partitionKeyFields: getArgStringArrayValue(
              'pkFields',
              directive
            ).map((fieldName) => getFieldFromFieldMap(fieldMap, fieldName)),
            partitionKeyPrefix: getOptionalArgStringValue(
              'pkPrefix',
              directive
            ),
            projectionType: getProjectionType(directive),
            sortKeyFields: getArgStringArrayValue('skFields', directive).map(
              (fieldName) => getFieldFromFieldMap(fieldMap, fieldName)
            ),
            sortKeyPrefix: getOptionalArgStringValue('skPrefix', directive),
            type: 'gsi',
          };
        }

        if (directive.name.value === 'simpleIndex') {
          const name = getArgStringValue('field', directive);
          return {
            isComposite: false,
            isSingleField: true,
            name,
            partitionKeyFields: [getFieldFromFieldMap(fieldMap, name)],
            projectionType: getProjectionType(directive),
            type: 'gsi',
          };
        }

        assert.equal(directive.name.value, 'secondaryIndex', ``);

        return {
          isComposite: true,
          isSingleField: false,
          name: getArgStringValue('name', directive),
          projectionType: getProjectionType(directive),
          sortKeyFields: getArgStringArrayValue('fields', directive).map(
            (fieldName) => getFieldFromFieldMap(fieldMap, fieldName)
          ),
          sortKeyPrefix: getOptionalArgStringValue('prefix', directive),
          type: 'lsi',
        };
      }) ?? [];

  if (hasInterface('PublicModel', type)) {
    const publicIdIndex: GSI = {
      isComposite: false,
      isSingleField: true,
      name: 'publicId',
      partitionKeyFields: [getFieldFromFieldMap(fieldMap, 'publicId')],
      projectionType: hasDirective('public', type)
        ? getProjectionType(getDirective('public', type))
        : 'all',
      type: 'gsi',
    };

    indexes.push(publicIdIndex);
  }
  return indexes;
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
    enableStreaming:
      hasDirective('enriches', type) ||
      hasDirective('triggers', type) ||
      (!!tableDirective &&
        (getOptionalArgBooleanValue('enableStreaming', tableDirective) ??
          false)),
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

  if (!duration) {
    assert(
      !isNonNullType(field),
      'TTL field must be nullable if duration is not specified'
    );

    return {fieldName};
  }

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

/** helper */
export function getAliasForField(
  field: GraphQLField<unknown, unknown>,
  type: GraphQLObjectType<unknown, unknown>,
  fieldName: string
) {
  if (hasDirective('ttl', field)) {
    return 'ttl';
  }

  if (hasDirective('alias', field)) {
    const {astNode} = field;
    assert(astNode);
    return getArgStringValue('name', getDirective('alias', astNode));
  }

  switch (field.name) {
    case 'version':
      return '_v';
    case 'createdAt':
      return '_ct';
    case 'updatedAt':
      return '_md';
    // do not snakeCase publicId (to support a legacy project). At some future
    // point, this and the general index column issue of camel-not-snake needs
    //
    case 'publicId':
      return 'publicId';
    default:
      return getCaseType(type) === 'CAMEL_CASE'
        ? camelCase(fieldName)
        : snakeCase(fieldName);
  }
}

/** helper  */
function getReadAliasesForField(
  field: GraphQLField<unknown, unknown>,
  type: GraphQLObjectType<unknown, unknown>,
  fieldName: string
): readonly string[] {
  if (hasDirective('ttl', field)) {
    return ['ttl'];
  }

  if (hasDirective('alias', field)) {
    const {astNode} = field;
    assert(astNode);
    return [getArgStringValue('name', getDirective('alias', astNode))];
  }

  switch (field.name) {
    case 'version':
      return ['_v'];
    case 'createdAt':
      return ['_ct'];
    case 'updatedAt':
      return ['_md'];
    // do not snakeCase publicId (to support a legacy project). At some future
    // point, this and the general index column issue of camel-not-snake needs
    //
    case 'publicId':
      return ['publicId'];
    default:
      return getCaseType(type) === 'CAMEL_CASE'
        ? [camelCase(fieldName), snakeCase(fieldName)]
        : [snakeCase(fieldName), camelCase(fieldName)];
  }
}

/** helper  */
function getCaseType(
  type: GraphQLObjectType<unknown, unknown>
): 'CAMEL_CASE' | 'SNAKE_CASE' {
  const tableDirective = getOptionalDirective('table', type);
  if (tableDirective) {
    const arg = getOptionalArg('columnCase', tableDirective);
    if (arg) {
      assert(arg.value.kind === 'EnumValue');
      if (arg.value.value === 'CAMEL_CASE') {
        return 'CAMEL_CASE';
      }
      assert(arg.value.value === 'SNAKE_CASE');
    }
  }
  return 'SNAKE_CASE';
}
