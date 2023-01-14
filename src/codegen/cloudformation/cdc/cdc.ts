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
  if (model.changeDataCaptureConfig?.type !== 'CDC') {
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
    typeName,
  } = model;

  const handlerFileName = `handler-${kebabCase(typeName)}`;
  const handlerFunctionName = `${typeName}CDCHandler`;
  const handlerOutputPath = path.join(
    path.dirname(outputFile),
    handlerFileName
  );

  const actionsModuleId = config.actionsModuleId.startsWith('.')
    ? path.relative(handlerOutputPath, config.actionsModuleId)
    : config.actionsModuleId;

  return combineFragments(
    makeHandler({
      actionsModuleId,
      codeUri: handlerFileName,
      dependenciesModuleId,
      event,
      functionName: handlerFunctionName,
      handlerModuleId,
      libImportPath,
      outputPath: handlerOutputPath,
      sourceModelName,
      tableName,
      targetTable,
      typeName: sourceModelName,
    })
  );
}
