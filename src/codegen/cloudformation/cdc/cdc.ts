import type {Table} from '../../parser';
import {combineFragments} from '../fragments/combine-fragments';
import {metadata} from '../fragments/lambda';
import {makeLogGroup} from '../fragments/log-group';
import {makeTableDispatcher} from '../fragments/table-dispatcher';
import type {CloudFormationFragment} from '../types';

import {makeHandler} from './lambdas';

/** Generates CDC config for a type */
export function defineCdc(table: Table): CloudFormationFragment {
  if (!table.changeDataCaptureConfig) {
    return {};
  }

  const {
    changeDataCaptureConfig: {
      actionsModuleId,
      dispatcherOutputPath,
      dispatcherFileName,
      dispatcherFunctionName,
      handlerFileName,
      handlerFunctionName,
      handlerModuleId,
      handlerOutputPath,
      event,
      sourceModelName,
      targetTable,
    },
    dependenciesModuleId,
    libImportPath,
    name: tableName,
  } = table;

  makeHandler({
    actionsModuleId,
    dependenciesModuleId,
    handlerModuleId,
    handlerOutputPath,
    libImportPath,
    typeName: sourceModelName,
  });

  const handler = {
    resources: {
      [`${handlerFunctionName}DLQ`]: {
        Properties: {
          KmsMasterKeyId: 'alias/aws/sqs',
        },
        Type: 'AWS::SQS::Queue',
      },
      [`${handlerFunctionName}EventBridgeDLQ`]: {
        Properties: {
          KmsMasterKeyId: 'alias/aws/sqs',
        },
        Type: 'AWS::SQS::Queue',
      },
      [handlerFunctionName]: {
        Metadata: metadata,
        Properties: {
          CodeUri: handlerFileName,
          DeadLetterQueue: {
            TargetArn: {
              'Fn::GetAtt': [`${handlerFunctionName}EventBridgeDLQ`, 'Arn'],
            },
            Type: 'SQS',
          },
          Events: {
            [event]: {
              Properties: {
                DeadLetterConfig: {
                  Arn: {'Fn::GetAtt': [`${handlerFunctionName}DLQ`, 'Arn']},
                },
                EventBusName: 'default',
                Pattern: {
                  detail: {
                    dynamodb: {
                      NewImage: {
                        _et: {
                          S: [`${sourceModelName}`],
                        },
                      },
                    },
                  },
                  'detail-type':
                    event === 'UPSERT' ? ['INSERT', 'MODIFY'] : [event],
                  resources: [{'Fn::GetAtt': [tableName, 'Arn']}],
                  source: [`${tableName}.${sourceModelName}`],
                },
              },
              Type: 'EventBridgeRule',
            },
          },
          Policies: [
            'AWSLambdaBasicExecutionRole',
            'AWSLambda_ReadOnlyAccess',
            'AWSXrayWriteOnlyAccess',
            'CloudWatchLambdaInsightsExecutionRolePolicy',
            {CloudWatchPutMetricPolicy: {}},
            {
              DynamoDBCrudPolicy: {
                TableName: {Ref: targetTable},
              },
            },
            {
              SQSSendMessagePolicy: {
                QueueName: {
                  'Fn::GetAtt': [`${handlerFunctionName}DLQ`, 'QueueName'],
                },
              },
            },
          ],
        },
        Type: 'AWS::Serverless::Function',
      },
    },
  };

  return combineFragments(
    makeTableDispatcher({
      codeUri: dispatcherFileName,
      dependenciesModuleId,
      functionName: dispatcherFunctionName,
      libImportPath,
      outputPath: dispatcherOutputPath,
      tableName,
    }),
    makeLogGroup({functionName: handlerFunctionName}),
    handler
  );
}
