import path from 'path';

import {GraphQLObjectType} from 'graphql';
import {kebabCase} from 'lodash';

import {hasDirective} from '../../common/helpers';
import {CloudformationPluginConfig} from '../config';
import {CloudFormationFragment} from '../types';

import {makeTableDispatcher} from './lambdas';

/** Generates CDC config for a type */
export function defineCdc(
  config: CloudformationPluginConfig,
  type: GraphQLObjectType,
  info: {outputFile: string}
): CloudFormationFragment {
  if (!hasDirective('cdc', type)) {
    return {};
  }
  const isExample = !!process.env.IS_EXAMPLE;
  const libImportPath = isExample ? '../../../..' : '@ianwremmel/data';

  const typeName = type.name;

  const modelName = typeName;
  const tableName = `Table${typeName}`;

  const dispatcherFilename = `dispatcher-${kebabCase(tableName)}`;
  const dispatcherFunctionName = `${tableName}CDCDispatcher`;

  const dependenciesModuleId = path.join(
    // Need to add a level because we're going deeper than the output file.
    '..',
    path.relative(
      path.resolve(process.cwd(), path.dirname(info.outputFile)),
      path.resolve(process.cwd(), config.dependenciesModuleId)
    )
  );

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
    },
  };
}
