import assert from 'assert';
import {readFileSync} from 'fs';
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

  const tpl = {
    AWSTemplateFormatVersion: '2010-09-09',
    Conditions: {
      IsProd: {'Fn::Equals': [{Ref: 'StageName'}, 'production']},
    },
    Globals: {
      Function: {
        Environment: {
          Variables: allResources.env,
        },
        Handler: 'index.handler',
        MemorySize: 256,
        Runtime: 'nodejs18.x',
        Timeout: 30,
        Tracing: 'Active',
      },
    },
    Outputs: allResources.output,
    Parameters: {
      ...allResources.parameters,
      StageName: {
        AllowedValues: ['development', 'production', 'test'],
        Default: 'development',
        Description: 'The name of the stage',
        Type: 'String',
      },
    },
    Resources: allResources.resources,
    Transform: 'AWS::Serverless-2016-10-31',
  };

  return yml.dump(tpl, {noRefs: true, sortKeys: true});
};
