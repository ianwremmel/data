import assert from 'assert';

import type {
  ConstDirectiveNode,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';
import {assertObjectType} from 'graphql';

import {filterNull} from '../../common/filters';
import {
  getArgStringValue,
  getOptionalArg,
  getOptionalArgStringValue,
} from '../helpers';
import {extractTableName} from '../parser';
import type {
  ChangeDataCaptureConfig,
  ChangeDataCaptureEnricherConfig,
  ChangeDataCaptureTriggerConfig,
  LegacyChangeDataCaptureConfig,
} from '../types';

/** Extracts CDC config for a type */
export function extractChangeDataCaptureConfig(
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>
): ChangeDataCaptureConfig[] {
  return (
    type.astNode?.directives
      ?.map((directive) => {
        if (directive.name.value === 'enriches') {
          return extractEnricherConfig(schema, type, directive);
        }
        if (directive.name.value === 'triggers') {
          return extractTriggersConfig(schema, type, directive);
        }
        if (directive.name.value === 'cdc') {
          return extractLegacyConfig(schema, type, directive);
        }
        return null;
      })
      .filter(filterNull) ?? []
  );
}

/** helper */
function getTargetTable(
  schema: GraphQLSchema,
  modelName: string,
  produces: string
) {
  const targetModel = schema.getType(produces);
  assert(
    targetModel,
    `\`produces\` arg on @cdc for ${modelName} identifies ${produces}, which does not appear to identify a type`
  );
  return extractTableName(assertObjectType(targetModel));
}

/** helper */
export function getTargetTables(
  fieldName: string,
  schema: GraphQLSchema,
  directive: ConstDirectiveNode
): string[] {
  const arg = getOptionalArg(fieldName, directive);
  if (!arg) {
    return [];
  }

  assert(arg.value.kind === 'ListValue', `Expected ${fieldName} to be a list`);
  return Array.from(
    new Set(
      arg.value.values.map((v) => {
        assert(
          v.kind === 'StringValue',
          `Expected @${directive.name.value} directive argument "${fieldName}" to be a list of strings`
        );
        return getTargetTable(schema, directive.name.value, v.value);
      })
    )
  );
}

/** helper */
function extractEnricherConfig(
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>,
  directive: ConstDirectiveNode
): ChangeDataCaptureEnricherConfig {
  const event = getEvent(type, directive);
  const handlerModuleId = getArgStringValue('handler', directive);

  const targetModelName = getArgStringValue('targetModel', directive);
  return {
    event,
    handlerModuleId,
    sourceModelName: type.name,
    targetModelName,
    type: 'ENRICHER',
    writableTables: [getTargetTable(schema, type.name, targetModelName)],
  };
}

/** helper */
function extractLegacyConfig(
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>,
  directive: ConstDirectiveNode
): LegacyChangeDataCaptureConfig {
  const event = getEvent(type, directive);

  const handlerModuleId = getArgStringValue('handler', directive);

  const targetTable = getTargetTable(
    schema,
    type.name,
    getArgStringValue('produces', directive)
  );

  return {
    event,
    handlerModuleId,
    sourceModelName: type.name,
    targetTable,
    type: 'CDC',
  };
}

/** helper */
function extractTriggersConfig(
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>,
  directive: ConstDirectiveNode
): ChangeDataCaptureTriggerConfig {
  const event = getEvent(type, directive);
  const handlerModuleId = getArgStringValue('handler', directive);

  const readableTables = getTargetTables('readableModels', schema, directive);

  const writableTables = getTargetTables('writableModels', schema, directive);

  return {
    event,
    handlerModuleId,
    readableTables,
    sourceModelName: type.name,
    type: 'TRIGGER',
    writableTables,
  };
}

/** helper */
function getEvent(
  type: GraphQLObjectType<unknown, unknown>,
  directive: ConstDirectiveNode
) {
  const event = getArgStringValue('event', directive);
  assert(
    event === 'INSERT' ||
      event === 'MODIFY' ||
      event === 'REMOVE' ||
      event === 'UPSERT',
    `Invalid event type ${event} for @${directive.name.value} on ${type.name}`
  );
  return event;
}
