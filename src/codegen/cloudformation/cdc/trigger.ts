import path from 'path';

import {camelCase, kebabCase, upperFirst} from 'lodash';

import {increasePathDepth, resolveActionsModule} from '../../common/paths';
import type {Model} from '../../parser';
import type {CloudformationPluginConfig} from '../config';
import {combineFragments} from '../fragments/combine-fragments';
import type {CloudFormationFragment} from '../types';

import {makeHandler} from './lambdas';

/** Generates CDC config for a model */
export function defineTriggerCdc(
  model: Model,
  config: CloudformationPluginConfig,
  {outputFile}: {outputFile: string}
): CloudFormationFragment {
  if (!model.changeDataCaptureConfig) {
    return {};
  }

  if (model.changeDataCaptureConfig.type !== 'TRIGGER') {
    return {};
  }

  const {
    changeDataCaptureConfig: {handlerModuleId, event, sourceModelName},
    dependenciesModuleId,
    libImportPath,
    tableName,
  } = model;

  const handlerFileName = `trigger--${kebabCase(
    sourceModelName
  )}--${event.toLowerCase()}`;
  const handlerFunctionName = `Fn${upperFirst(camelCase(handlerFileName))}`;
  const handlerOutputPath = path.join(
    path.dirname(outputFile),
    handlerFileName
  );

  const actionsModuleId = resolveActionsModule(
    handlerOutputPath,
    config.actionsModuleId
  );

  const resolvedDependenciesModuleId = increasePathDepth(dependenciesModuleId);
  const resolvedHandlerModuleId = increasePathDepth(handlerModuleId);

  const template = `// This file is generated. Do not edit by hand.

import {assert, makeTriggerHandler} from '${libImportPath}';

import * as dependencies from '${resolvedDependenciesModuleId}';
import {handler as cdcHandler} from '${resolvedHandlerModuleId}';
import {unmarshall${sourceModelName}} from '${actionsModuleId}';

export const handler = makeTriggerHandler(dependencies, (record) => {
  assert(record.dynamodb.NewImage, 'Expected DynamoDB Record to have a NewImage');
  return cdcHandler(unmarshall${sourceModelName}(record.dynamodb.NewImage));
});
`;

  return combineFragments(
    makeHandler({
      codeUri: handlerFileName,
      dependenciesModuleId,
      event,
      functionName: handlerFunctionName,
      libImportPath,
      outputPath: handlerOutputPath,
      sourceModelName,
      tableName,
      template,
    })
  );
}
