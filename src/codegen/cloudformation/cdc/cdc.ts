import path from 'path';

import type {Table} from '../../parser';
import type {CloudformationPluginConfig} from '../config';
import {combineFragments} from '../fragments/combine-fragments';
import {makeTableDispatcher} from '../fragments/table-dispatcher';
import type {CloudFormationFragment} from '../types';

import {makeHandler} from './lambdas';

/** Generates CDC config for a type */
export function defineCdc(
  table: Table,
  config: CloudformationPluginConfig
): CloudFormationFragment {
  if (!table.changeDataCaptureConfig) {
    return {};
  }

  const {
    changeDataCaptureConfig: {
      dispatcherOutputPath,
      dispatcherFileName,
      dispatcherFunctionName,
      handlerFileName,
      handlerFunctionName,
      handlerModuleId,
      handlerOutputPath,
      event,
      sourceModelName,
      targetTable,
    },
    dependenciesModuleId,
    libImportPath,
    tableName,
  } = table;

  const actionsModuleId = config.actionsModuleId.startsWith('.')
    ? path.relative(handlerOutputPath, config.actionsModuleId)
    : config.actionsModuleId;

  return combineFragments(
    makeTableDispatcher({
      codeUri: dispatcherFileName,
      dependenciesModuleId,
      functionName: dispatcherFunctionName,
      libImportPath,
      outputPath: dispatcherOutputPath,
      tableName,
    }),
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
