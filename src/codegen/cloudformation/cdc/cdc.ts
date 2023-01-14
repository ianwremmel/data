import path from 'path';

import {kebabCase} from 'lodash';

import type {Model, Table} from '../../parser';
import type {CloudformationPluginConfig} from '../config';
import {combineFragments} from '../fragments/combine-fragments';
import {makeTableDispatcher} from '../fragments/table-dispatcher';
import type {CloudFormationFragment} from '../types';

import {makeHandler} from './lambdas';

/** Generates CDC config for a table */
export function defineTableCdc(
  table: Table,
  config: CloudformationPluginConfig,
  {outputFile}: {outputFile: string}
): CloudFormationFragment {
  if (!table.hasCdc) {
    return {};
  }

  const {dependenciesModuleId, libImportPath, tableName} = table;

  const dispatcherFileName = `dispatcher-${kebabCase(tableName)}`;
  const dispatcherFunctionName = `${tableName}CDCDispatcher`;
  const dispatcherOutputPath = path.join(
    path.dirname(outputFile),
    dispatcherFileName
  );

  return combineFragments(
    makeTableDispatcher({
      codeUri: dispatcherFileName,
      dependenciesModuleId,
      functionName: dispatcherFunctionName,
      libImportPath,
      outputPath: dispatcherOutputPath,
      tableName,
    })
  );
}

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
