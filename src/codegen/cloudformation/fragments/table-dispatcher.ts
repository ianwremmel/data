import path from 'path';

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
  codeUri,
  functionName,
  outputPath,
  libImportPath,
  maximumRetryAttempts = 3,
  memorySize = 384,
  tableName,
  timeout = 60,
}: TableDispatcherInput): CloudFormationFragment {
  // Account for the fact that the parser only knows the module id, not produced
  // directory layout
  dependenciesModuleId = dependenciesModuleId.startsWith('.')
    ? path.join('..', dependenciesModuleId)
    : dependenciesModuleId;

  writeLambda(
    outputPath,
    `// This file is generated. Do not edit by hand.

import {makeDynamoDBStreamDispatcher} from '${libImportPath}';
import * as dependencies from '${dependenciesModuleId}';

export const handler = makeDynamoDBStreamDispatcher({
  ...dependencies,
  tableName: '${tableName}',
});
`
  );

  return combineFragments(
    makeLogGroup({
      functionName,
    }),
    {
      resources: {
        [functionName]: {
          Metadata: metadata,
          Properties: {
            CodeUri: codeUri,
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
    }
  );
}
