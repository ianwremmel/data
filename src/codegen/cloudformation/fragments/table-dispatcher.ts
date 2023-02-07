import {increasePathDepth} from '../../common/paths';
import type {DispatcherConfig} from '../../parser';
import {makeDispatcherAlarms} from '../alarms';
import type {CloudFormationFragment} from '../types';

import {combineFragments} from './combine-fragments';
import type {LambdaDynamoDBEventInput, LambdaInput} from './lambda';
import {writeLambda} from './lambda';
import {makeLogGroup} from './log-group';

export interface TableDispatcherInput
  extends LambdaInput,
    LambdaDynamoDBEventInput {
  dispatcherConfig: DispatcherConfig;
}

/** cloudformation generator */
export function makeTableDispatcher({
  batchSize = 10,
  buildProperties,
  dependenciesModuleId,
  dispatcherConfig,
  codeUri,
  functionName,
  outputPath,
  libImportPath,
  maximumRetryAttempts = 3,
  tableName,
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

  const {memorySize, timeout} = dispatcherConfig;

  return combineFragments(
    makeLogGroup({functionName}),
    makeDispatcherAlarms(functionName, dispatcherConfig),
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
