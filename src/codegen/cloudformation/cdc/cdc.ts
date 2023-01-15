import path from 'path';

import {kebabCase} from 'lodash';

import type {Model} from '../../parser';
import type {CloudformationPluginConfig} from '../config';
import {combineFragments} from '../fragments/combine-fragments';
import type {CloudFormationFragment} from '../types';

import {makeHandler} from './lambdas';

/** Generates CDC config for a model */
export function defineModelCdc(
  model: Model,
  config: CloudformationPluginConfig,
  {outputFile}: {outputFile: string}
): CloudFormationFragment {
  if (!model.changeDataCaptureConfig) {
    return {};
  }

  if (model.changeDataCaptureConfig.type !== 'CDC') {
    return {};
  }

  const {
    changeDataCaptureConfig: {
      handlerModuleId,
      event,
      sourceModelName,
      targetTable,
    },
    dependenciesModuleId,
    libImportPath,
    tableName,
  } = model;

  const handlerFileName = `handler-${kebabCase(sourceModelName)}`;
  const handlerFunctionName = `${sourceModelName}CDCHandler`;
  const handlerOutputPath = path.join(
    path.dirname(outputFile),
    handlerFileName
  );

  const actionsModuleId = config.actionsModuleId.startsWith('.')
    ? path.relative(handlerOutputPath, config.actionsModuleId)
    : config.actionsModuleId;

  // Account for the fact that the parser only knows the module id, not produced
  // directory layout
  const resolvedDependenciesModuleId = dependenciesModuleId.startsWith('.')
    ? path.join('..', dependenciesModuleId)
    : dependenciesModuleId;

  const resolvedHandlerModuleId = handlerModuleId.startsWith('.')
    ? path.join('..', handlerModuleId)
    : handlerModuleId;

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
      codeUri: handlerFileName,
      dependenciesModuleId,
      event,
      functionName: handlerFunctionName,
      libImportPath,
      outputPath: handlerOutputPath,
      sourceModelName,
      tableName,
      targetTable,
      template,
    })
  );
}
