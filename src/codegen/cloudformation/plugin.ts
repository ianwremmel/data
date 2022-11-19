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

  const allResources = Object.keys(typesMap)
    .filter((typeName) => {
      const type = typesMap[typeName];
      return isObjectType(type) && hasInterface('Model', type);
    })
    .map((typeName) => {
      const objType = typesMap[typeName];
      assertObjectType(objType);
      const cdcResources = defineCdc(
        schema,
        config,
        objType as GraphQLObjectType,
        {
          outputFile,
        }
      );
      const tableResources = defineTable(objType as GraphQLObjectType);
      return {
        env: {
          ...cdcResources.env,
          ...tableResources.env,
        },
        output: {
          ...cdcResources.output,
          ...tableResources.output,
        },
        parameters: {
          ...cdcResources.parameters,
          ...tableResources.parameters,
        },
        resources: {
          ...cdcResources.resources,
          ...tableResources.resources,
        },
      };
    });

  // Eventually, this should modify an existing file by using Guard comments
  // and adding/replacing sections as relevant, but for now, we'll just do the
  // basic generation to prove the concept

  const tpl = {
    AWSTemplateFormatVersion: '2010-09-09',
    Transform: 'AWS::Serverless-2016-10-31',
    // eslint-disable-next-line sort-keys
    Conditions: {
      IsProd: {'Fn::Equals': [{Ref: 'StageName'}, 'production']},
    },
    Globals: {
      Function: {
        Environment: {
          Variables: allResources.reduce(
            (acc, {env}) => ({...acc, ...env}),
            {} as Record<string, {Ref: string}>
          ),
        },
        Handler: 'index.handler',
        MemorySize: 256,
        Runtime: 'nodejs18.x',
        Timeout: 30,
        Tracing: 'Active',
      },
    },
    Outputs: allResources.reduce(
      (acc, {output}) => ({
        ...acc,
        ...output,
      }),
      {} as Record<string, object>
    ),
    Parameters: allResources.reduce(
      (acc, {parameters}) => ({
        ...acc,
        ...parameters,
      }),
      {
        StageName: {
          Type: 'String',
          // eslint-disable-next-line sort-keys
          AllowedValues: ['development', 'production', 'test'],
          Description: 'The name of the stage',
          // eslint-disable-next-line sort-keys
          Default: 'development',
        },
      }
    ),
    Resources: allResources.reduce(
      (acc, {resources}) => ({
        ...acc,
        ...resources,
      }),
      {} as Record<string, object>
    ),
  };

  return yml.dump(tpl);
};
