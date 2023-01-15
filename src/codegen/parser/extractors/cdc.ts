import assert from 'assert';

import type {
  ConstDirectiveNode,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';
import {assertObjectType} from 'graphql';

import {
  getArgStringValue,
  getDirective,
  getOptionalDirective,
  hasDirective,
} from '../helpers';
import {extractTableName} from '../parser';
import type {
  ChangeDataCaptureConfig,
  ChangeDataCaptureEnricherConfig,
  ChangeDataCaptureTriggerConfig,
} from '../types';

/** Extracts CDC config for a type */
export function extractChangeDataCaptureConfig(
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>
): ChangeDataCaptureConfig | undefined {
  if (hasDirective('enriches', type)) {
    return extractEnricherConfig(schema, type);
  }

  if (hasDirective('triggers', type)) {
    return extractTriggersConfig(schema, type);
  }

  const directive = getOptionalDirective('cdc', type);
  if (!directive) {
    return undefined;
  }

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
function extractEnricherConfig(
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>
): ChangeDataCaptureEnricherConfig {
  const directive = getDirective('enriches', type);
  const event = getEvent(type, directive);
  const handlerModuleId = getArgStringValue('handler', directive);

  const targetModelName = getArgStringValue('targetModel', directive);
  return {
    event,
    handlerModuleId,
    sourceModelName: type.name,
    targetModelName,
    targetTable: getTargetTable(schema, type.name, targetModelName),
    type: 'ENRICHER',
  };
}

/** helper */
function extractTriggersConfig(
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>
): ChangeDataCaptureTriggerConfig {
  const directive = getDirective('triggers', type);
  const event = getEvent(type, directive);
  const handlerModuleId = getArgStringValue('handler', directive);

  return {
    event,
    handlerModuleId,
    sourceModelName: type.name,
    type: 'TRIGGER',
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
