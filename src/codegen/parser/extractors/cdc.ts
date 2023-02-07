import assert from 'assert';

import type {
  ConstDirectiveNode,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';
import {assertObjectType} from 'graphql';

import {filterNull} from '../../common/filters';
import {getArgStringValue, getOptionalArg} from '../helpers';
import {extractTableName} from '../parser';
import type {
  ChangeDataCaptureConfig,
  ChangeDataCaptureEnricherConfig,
  ChangeDataCaptureTriggerConfig,
  DispatcherConfig,
  HandlerConfig,
} from '../types';

import {extractDispatcherConfig, extractHandlerConfig} from './lambda-config';

/** Extracts CDC config for a type */
export function extractChangeDataCaptureConfig<
  CONFIG extends {
    defaultDispatcherConfig: DispatcherConfig;
    defaultHandlerConfig: HandlerConfig;
  }
>(
  config: CONFIG,
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>
): ChangeDataCaptureConfig[] {
  return (
    type.astNode?.directives
      ?.map((directive) => {
        if (directive.name.value === 'enriches') {
          return extractEnricherConfig(config, schema, type, directive);
        }
        if (directive.name.value === 'triggers') {
          return extractTriggersConfig(config, schema, type, directive);
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
function extractEnricherConfig<
  CONFIG extends {
    defaultDispatcherConfig: DispatcherConfig;
    defaultHandlerConfig: HandlerConfig;
  }
>(
  config: CONFIG,
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>,
  directive: ConstDirectiveNode
): ChangeDataCaptureEnricherConfig {
  const event = getEvent(type, directive);
  const handlerModuleId = getArgStringValue('handler', directive);

  const targetModelName = getArgStringValue('targetModel', directive);
  return {
    dispatcherConfig: extractDispatcherConfig(config, directive),
    event,
    handlerConfig: extractHandlerConfig(config, directive),
    handlerModuleId,
    sourceModelName: type.name,
    targetModelName,
    type: 'ENRICHER',
    writableTables: [getTargetTable(schema, type.name, targetModelName)],
  };
}

/** helper */
function extractTriggersConfig<
  CONFIG extends {
    defaultDispatcherConfig: DispatcherConfig;
    defaultHandlerConfig: HandlerConfig;
  }
>(
  config: CONFIG,
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>,
  directive: ConstDirectiveNode
): ChangeDataCaptureTriggerConfig {
  const event = getEvent(type, directive);
  const handlerModuleId = getArgStringValue('handler', directive);

  const readableTables = getTargetTables('readableModels', schema, directive);

  const writableTables = getTargetTables('writableModels', schema, directive);

  return {
    dispatcherConfig: extractDispatcherConfig(config, directive),
    event,
    handlerConfig: extractHandlerConfig(config, directive),
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
