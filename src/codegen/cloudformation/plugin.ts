import assert from 'assert';
import fs, {readFileSync} from 'fs';
import path from 'path';

import type {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';
import yml from 'js-yaml';
import {CLOUDFORMATION_SCHEMA} from 'js-yaml-cloudformation-schema';

import {filterNull} from '../common/filters';
import {parse} from '../parser';

import {defineTableCdc, defineModelEnricher, defineTriggerCdc} from './cdc';
import type {CloudformationPluginConfig} from './config';
import {combineFragments} from './fragments/combine-fragments';
import {defineTable} from './table';

/** @override */
export function addToSchema(): AddToSchemaResult {
  return readFileSync(path.resolve(__dirname, '../schema.graphqls'), 'utf8');
}

/**
 * Loads an existing consumer-generated CF template or returns a basic template
 */
function getInitialTemplate({sourceTemplate}: CloudformationPluginConfig) {
  if (sourceTemplate) {
    const raw = fs.readFileSync(sourceTemplate, 'utf8');
    try {
      return JSON.parse(raw);
    } catch {
      return yml.load(raw, {schema: CLOUDFORMATION_SCHEMA});
    }
  }

  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: 'AWS::Serverless-2016-10-31',
  };
}

/** @override */
export const plugin: PluginFunction<CloudformationPluginConfig> = (
  schema,
  documents,
  config,
  info
) => {
  const outputFile = info?.outputFile;
  assert(outputFile, 'outputFile is required');

  const {models, tables} = parse(
    schema,
    documents,
    {
      ...config,
      defaultDispatcherConfig: {
        memorySize: 384,
        timeout: 60,
      },
      defaultHandlerConfig: {
        memorySize: 256,
        timeout: 30,
      },
    },
    info
  );

  const allResources = combineFragments(
    ...tables.map((table) =>
      combineFragments(
        defineTableCdc(table, config, {outputFile}),
        defineTable(table)
      )
    ),
    ...models.flatMap((model) =>
      model.changeDataCaptureConfig
        .map((cdcConfig) =>
          cdcConfig.type === 'ENRICHER'
            ? defineModelEnricher(model, cdcConfig, config, {outputFile})
            : null
        )
        .filter(filterNull)
    ),
    ...models.flatMap((model) =>
      model.changeDataCaptureConfig
        .map((cdcConfig) =>
          cdcConfig.type === 'TRIGGER'
            ? defineTriggerCdc(model, cdcConfig, config, {outputFile})
            : null
        )
        .filter(filterNull)
    )
  );

  const initialTemplate = getInitialTemplate(config);

  const tpl = {
    ...initialTemplate,

    Conditions: {
      ...initialTemplate.Conditions,
      ...allResources.conditions,
    },
    Globals: {
      Function: {
        Handler: 'index.handler',
        MemorySize: 256,
        Runtime: 'nodejs18.x',
        Timeout: 30,
        Tracing: 'Active',
        ...initialTemplate?.Globals?.Function,
        Environment: {
          ...initialTemplate?.Globals?.Function?.Environment,
          Variables: {
            ...initialTemplate?.Globals?.Function?.Environment?.Variables,
            ...allResources.env,
          },
        },
      },
    },
    Outputs: {
      ...initialTemplate.Outputs,
      ...allResources.output,
    },
    Parameters: {
      ...initialTemplate.Parameters,
      ...allResources.parameters,
      StageName: {
        AllowedValues: ['development', 'production', 'test'],
        Default: 'development',
        Description: 'The name of the stage',
        Type: 'String',
      },
    },
    Resources: {
      ...initialTemplate.Resources,
      ...allResources.resources,
    },
  };
  const format = config.outputConfig?.format ?? 'json';
  if (format === 'json') {
    return JSON.stringify(tpl, null, 2);
  }

  return yml.dump(tpl, {
    noRefs: true,
    sortKeys: true,
    ...config.outputConfig?.yamlConfig,
  });
};
