import fs from 'fs';
import path from 'path';

import type {GraphQLObjectType} from 'graphql';
import {kebabCase} from 'lodash';

import type {CloudformationPluginConfig} from '../config';
import type {CloudFormationFragment} from '../types';

import {makeLogGroup} from './log-group';

export interface MakeTableDispatcherInput {
  readonly dependenciesModuleId: string;
  readonly libImportPath: string;
  readonly modelName: string;
  readonly outDir: string;
  readonly tableName: string;
}

/** generate the dispatcher lambda function */
export function makeTableDispatcher({
  dependenciesModuleId,
  libImportPath,
  modelName,
  outDir,
  tableName,
}: MakeTableDispatcherInput) {
  const code = `// This file is generated. Do not edit by hand.

import {makeDynamoDBStreamDispatcher} from '${libImportPath}';
import * as dependencies from '${dependenciesModuleId}';

export const handler = makeDynamoDBStreamDispatcher({
  ...dependencies,
  modelName: '${modelName}',
  tableName: '${tableName}',
});
`;

  fs.mkdirSync(outDir, {recursive: true});
  fs.writeFileSync(path.join(outDir, 'index.ts'), code);
}

/** Generates CloudFormation config for a CDC dispatcher */
export function makeCdcDispatcher(
  config: CloudformationPluginConfig,
  type: GraphQLObjectType,
  info: {outputFile: string}
): CloudFormationFragment {
  const isExample = !!process.env.IS_EXAMPLE;
  const libImportPath = isExample ? '../../../..' : '@ianwremmel/data';

  const typeName = type.name;

  const modelName = typeName;
  const tableName = `Table${typeName}`;

  const dependenciesModuleId = path.join(
    // Need to add a level because we're going deeper than the output file.
    '..',
    path.relative(
      path.resolve(process.cwd(), path.dirname(info.outputFile)),
      path.resolve(process.cwd(), config.dependenciesModuleId)
    )
  );

  const dispatcherFilename = `dispatcher-${kebabCase(tableName)}`;

  const dispatcherFunctionName = `${tableName}CDCDispatcher`;

  makeTableDispatcher({
    dependenciesModuleId,
    libImportPath,
    modelName,
    outDir: path.join(path.dirname(info.outputFile), dispatcherFilename),
    tableName,
  });

  return {
    resources: {
      [dispatcherFunctionName]: {
        Type: 'AWS::Serverless::Function',
        // eslint-disable-next-line sort-keys
        Properties: {
          CodeUri: dispatcherFilename,
          Events: {
            Stream: {
              Type: 'DynamoDB',
              // eslint-disable-next-line sort-keys
              Properties: {
                BatchSize: 10,
                FunctionResponseTypes: ['ReportBatchItemFailures'],
                MaximumRetryAttempts: 3,
                StartingPosition: 'TRIM_HORIZON',
                Stream: {'Fn::GetAtt': [tableName, 'StreamArn']},
              },
            },
          },
          MemorySize: 384,
          Policies: [
            'AWSLambdaBasicExecutionRole',
            'AWSLambda_ReadOnlyAccess',
            'AWSXrayWriteOnlyAccess',
            'CloudWatchLambdaInsightsExecutionRolePolicy',
            {CloudWatchPutMetricPolicy: {}},
            {
              EventBridgePutEventsPolicy: {
                EventBusName: 'default',
              },
            },
          ],
          Timeout: 60,
        },
        // eslint-disable-next-line sort-keys
        Metadata: {
          BuildMethod: 'esbuild',
          BuildProperties: {
            EntryPoints: ['./index'],
            Minify: false,
            Sourcemap: true,
            Target: 'es2020',
          },
        },
      },
      ...makeLogGroup(dispatcherFunctionName),
    },
  };
}
