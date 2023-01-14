import assert from 'assert';

import type {GraphQLObjectType, GraphQLSchema} from 'graphql';
import {assertObjectType} from 'graphql';

import {getArgStringValue, getOptionalDirective} from '../helpers';
import {extractTableName} from '../parser';
import type {ChangeDataCaptureConfig} from '../types';

/** Extracts CDC config for a type */
export function extractChangeDataCaptureConfig(
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>
): ChangeDataCaptureConfig | undefined {
  const directive = getOptionalDirective('cdc', type);
  if (!directive) {
    return undefined;
  }

  const event = getArgStringValue('event', directive);
  assert(
    event === 'INSERT' ||
      event === 'MODIFY' ||
      event === 'REMOVE' ||
      event === 'UPSERT',
    `Invalid event type ${event} for @cdc on ${type.name}`
  );

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
