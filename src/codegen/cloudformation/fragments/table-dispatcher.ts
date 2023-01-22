import {increasePathDepth} from '../../common/paths';
import type {CloudFormationFragment} from '../types';

import {combineFragments} from './combine-fragments';
import type {LambdaDynamoDBEventInput, LambdaInput} from './lambda';
import {writeLambda} from './lambda';
import {makeLogGroup} from './log-group';

export interface TableDispatcherInput
  extends LambdaInput,
    LambdaDynamoDBEventInput {}

/** cloudformation generator */
export function makeTableDispatcher({
  batchSize = 10,
  buildProperties,
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
  dependenciesModuleId = increasePathDepth(dependenciesModuleId);

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
          Metadata: {
            BuildMethod: 'esbuild',
            BuildProperties: buildProperties,
          },
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
