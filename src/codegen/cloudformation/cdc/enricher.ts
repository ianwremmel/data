import path from 'path';

import {kebabCase} from 'lodash';

import type {Model} from '../../parser';
import type {CloudformationPluginConfig} from '../config';
import {combineFragments} from '../fragments/combine-fragments';
import type {CloudFormationFragment} from '../types';

import {makeHandler} from './lambdas';

/** Generates CDC Projector config for a model */
export function defineModelEnricher(
  model: Model,
  config: CloudformationPluginConfig,
  {outputFile}: {outputFile: string}
): CloudFormationFragment {
  if (model.changeDataCaptureConfig?.type !== 'ENRICHER') {
    return {};
  }

  const {
    changeDataCaptureConfig: {
      handlerModuleId,
      event,
      sourceModelName,
      targetModelName,
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

  // Account for the fact that the parser only knows the module id, not produced
  // directory layout
  const resolvedDependenciesModuleId = dependenciesModuleId.startsWith('.')
    ? path.join('..', dependenciesModuleId)
    : dependenciesModuleId;

  const resolvedHandlerModuleId = handlerModuleId.startsWith('.')
    ? path.join('..', handlerModuleId)
    : handlerModuleId;

  const template = `// This file is generated. Do not edit by hand.

import {makeEnricher} from '${libImportPath}';

import * as dependencies from '${resolvedDependenciesModuleId}';
import {create, load, update} from '${resolvedHandlerModuleId}';
import {
  ${sourceModelName},
  ${targetModelName},
  create${targetModelName},
  unmarshall${sourceModelName},
  update${targetModelName},
  Create${targetModelName}Input,
  Update${targetModelName}Input
} from '${actionsModuleId}';

export const handler = makeEnricher<
${sourceModelName},
${targetModelName},
Create${targetModelName}Input,
Update${targetModelName}Input
>(
  dependencies,
  {create, load, update},
  {
    createTargetModel: create${targetModelName},
    unmarshallSourceModel: unmarshall${sourceModelName},
    updateTargetModel: update${targetModelName}
  }
);
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
