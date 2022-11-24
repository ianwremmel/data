import assert from 'assert';
import fs, {readFileSync} from 'fs';
import path from 'path';

import type {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';
import type {GraphQLObjectType} from 'graphql';
import {assertObjectType, isObjectType} from 'graphql';
import yml from 'js-yaml';

import {hasInterface} from '../common/helpers';

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
      return yml.load(raw);
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
  const typesMap = schema.getTypeMap();

  assert(info);
  const {outputFile} = info;
  assert(outputFile, 'outputFile is required');

  const allResources = combineFragments(
    ...Object.keys(typesMap)
      .filter((typeName) => {
        const type = typesMap[typeName];
        return isObjectType(type) && hasInterface('Model', type);
      })
      .map((typeName) => {
        const objType = typesMap[typeName];
        assertObjectType(objType);
        return combineFragments(
          defineCdc(schema, config, objType as GraphQLObjectType, {
            outputFile,
          }),
          defineTable(objType as GraphQLObjectType)
        );
      })
  );

  // Eventually, this should modify an existing file by using Guard comments
  // and adding/replacing sections as relevant, but for now, we'll just do the
  // basic generation to prove the concept

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
          Variables: allResources.env,
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

  return yml.dump(tpl, {noRefs: true, sortKeys: true});
};
