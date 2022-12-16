import assert from 'assert';
import fs, {readFileSync} from 'fs';
import path from 'path';

import type {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';
import yml from 'js-yaml';
import {CLOUDFORMATION_SCHEMA} from 'js-yaml-cloudformation-schema';

import {parse} from '../parser';

import {defineCdc} from './cdc';
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

  const allResources = combineFragments(
    ...parse(schema, documents, config, info).map((table) =>
      combineFragments(
        defineCdc(table, config, {outputFile}),
        defineTable(table)
      )
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
