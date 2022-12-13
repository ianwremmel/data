import assert from 'assert';
import path from 'path';

import {assertObjectType} from 'graphql';
import type {GraphQLObjectType, GraphQLSchema} from 'graphql';
import {kebabCase} from 'lodash';

import {getArgStringValue, getOptionalDirective} from '../../common/helpers';
import {extractTableName} from '../parser';
import type {ChangeDataCaptureConfig} from '../types';

/** Extracts CDC config for a type */
export function extractChangeDataCaptureConfig<
  T extends {actionsModuleId: string; dependenciesModuleId: string}
>(
  schema: GraphQLSchema,
  type: GraphQLObjectType<unknown, unknown>,
  config: T,
  outputFile: string
): ChangeDataCaptureConfig | undefined {
  const directive = getOptionalDirective('cdc', type);
  if (!directive) {
    return undefined;
  }

  const sourceTableName = extractTableName(type);

  const event = getArgStringValue('event', directive);
  assert(
    event === 'INSERT' ||
      event === 'MODIFY' ||
      event === 'REMOVE' ||
      event === 'UPSERT',
    `Invalid event type ${event} for @cdc on ${type.name}`
  );

  const handlerFileName = `handler-${kebabCase(type.name)}`;
  const handlerModuleId = getArgStringValue('handler', directive);
  const handlerOutputPath = path.join(
    path.dirname(outputFile),
    handlerFileName
  );

  const targetTable = getTargetTable(
    schema,
    type.name,
    getArgStringValue('produces', directive)
  );

  const dispatcherFileName = `dispatcher-${kebabCase(sourceTableName)}`;
  return {
    actionsModuleId: path.relative(outputFile, config.actionsModuleId),
    dispatcherFileName,
    dispatcherFunctionName: `${sourceTableName}CDCDispatcher`,
    dispatcherOutputPath: path.join(
      path.dirname(outputFile),
      dispatcherFileName
    ),
    event,
    handlerFileName,
    handlerFunctionName: `${type.name}CDCHandler`,
    handlerModuleId,
    handlerOutputPath,
    sourceModelName: type.name,
    targetTable,
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
