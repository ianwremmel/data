import path from 'path';

import {kebabCase} from 'lodash';

import type {CloudFormationFragment} from '../types';

import {combineFragments} from './combine-fragments';
import type {LambdaDynamoDBEventInput, LambdaInput} from './lambda';
import {metadata, writeLambda} from './lambda';
import {makeLogGroup} from './log-group';

export interface TableDispatcherInput
  extends LambdaInput,
    LambdaDynamoDBEventInput {}

/** cloudformation generator */
export function makeTableDispatcher({
  batchSize = 10,
  dependenciesModuleId,
  outDir,
  libImportPath,
  maximumRetryAttempts = 3,
  memorySize = 384,
  tableName,
  timeout = 60,
}: TableDispatcherInput): CloudFormationFragment {
  const functionName = `${tableName}CDCDispatcher`;
  const filename = `dispatcher-${kebabCase(tableName)}`;

  writeLambda(
    path.join(path.dirname(outDir), filename),
    `// This file is generated. Do not edit by hand.

import {makeDynamoDBStreamDispatcher} from '${libImportPath}';
import * as dependencies from '${dependenciesModuleId}';

export const handler = makeDynamoDBStreamDispatcher({
  ...dependencies,
  tableName: '${tableName}',
});
`
  );

  const logGroup = makeLogGroup({functionName});
  return combineFragments(logGroup, {
    resources: {
      [functionName]: {
        Metadata: metadata,
        Properties: {
          CodeUri: filename,
          Events: {
            Stream: {
              Properties: {
                BatchSize: batchSize,
                FunctionResponseTypes: ['ReportBatchItemFailures'],
                MaximumRetryAttempts: maximumRetryAttempts,
                StartingPosition: 'TRIM_HORIZON',
                Stream: {'Fn::GetAtt': [tableName, 'StreamArn']},
              },
              Type: 'DynamoDB',
            },
          },
          MemorySize: memorySize,
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
          Timeout: timeout,
        },
        Type: 'AWS::Serverless::Function',
      },
    },
  });
}
