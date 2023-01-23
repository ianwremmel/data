import crypto from 'crypto';
import path from 'path';

import {camelCase, kebabCase, snakeCase, upperFirst} from 'lodash';

import {increasePathDepth, resolveActionsModule} from '../../common/paths';
import type {ChangeDataCaptureEnricherConfig, Model} from '../../parser';
import type {CloudformationPluginConfig} from '../config';
import {combineFragments} from '../fragments/combine-fragments';
import {buildPropertiesWithDefaults} from '../fragments/lambda';
import type {CloudFormationFragment} from '../types';

import {makeHandler} from './lambdas';

/** Generates CDC Projector config for a model */
export function defineModelEnricher(
  model: Model,
  {
    handlerModuleId,
    event,
    sourceModelName,
    targetModelName,
    targetTable,
  }: ChangeDataCaptureEnricherConfig,
  config: CloudformationPluginConfig,
  {outputFile}: {outputFile: string}
): CloudFormationFragment {
  const {dependenciesModuleId, libImportPath, tableName} = model;

  const handlerFileName = `enricher--${kebabCase(
    sourceModelName
  )}--${event.toLowerCase()}--${kebabCase(targetModelName)}`;
  const handlerFunctionName = `Fn${upperFirst(
    camelCase(
      `handler--${snakeCase(sourceModelName)
        .split('_')
        .map((c) => c[0])
        .join('-')}--${event}--${snakeCase(targetModelName)
        .split('_')
        .map((c) => c[0])
        .join('-')}}`
    )
  )}${crypto
    .createHash('sha1')
    .update(sourceModelName + event + targetModelName)
    .digest('hex')
    .slice(0, 8)}`;
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
      buildProperties: buildPropertiesWithDefaults(config.buildProperties),
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
