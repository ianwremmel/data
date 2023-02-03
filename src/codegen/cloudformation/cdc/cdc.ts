import path from 'path';

import {kebabCase} from 'lodash';

import {increasePathDepth, resolveActionsModule} from '../../common/paths';
import type {LegacyChangeDataCaptureConfig, Model} from '../../parser';
import type {CloudformationPluginConfig} from '../config';
import {combineFragments} from '../fragments/combine-fragments';
import {buildPropertiesWithDefaults} from '../fragments/lambda';
import type {CloudFormationFragment} from '../types';

import {makeHandler} from './lambdas';

/** Generates CDC config for a model */
export function defineModelCdc(
  model: Model,
  {
    handlerModuleId,
    event,
    sourceModelName,
    targetTable,
  }: LegacyChangeDataCaptureConfig,
  config: CloudformationPluginConfig,
  {outputFile}: {outputFile: string}
): CloudFormationFragment {
  const {dependenciesModuleId, libImportPath, tableName} = model;

  const handlerFileName = `handler-${kebabCase(sourceModelName)}`;
  const handlerFunctionName = `${sourceModelName}CDCHandler`;
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

import {assert, makeModelChangeHandler} from '${libImportPath}';

import * as dependencies from '${resolvedDependenciesModuleId}';
import {handler as cdcHandler} from '${resolvedHandlerModuleId}';
import {unmarshall${sourceModelName}} from '${actionsModuleId}';

export const handler = makeModelChangeHandler(dependencies, (record) => {
  assert(record.dynamodb.NewImage, 'Expected DynamoDB Record to have a NewImage');
  return cdcHandler(unmarshall${sourceModelName}(record.dynamodb.NewImage));
});
`;

  return combineFragments(
    makeHandler({
      buildProperties: buildPropertiesWithDefaults(config.buildProperties),
      codeUri: handlerFileName,
      dependenciesModuleId,
      event,
      functionName: handlerFunctionName,
      libImportPath,
      outputPath: handlerOutputPath,
      readableTables: [],
      sourceModelName,
      tableName,
      template,
      writeableTables: [targetTable],
    })
  );
}
