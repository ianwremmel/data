import path from 'path';

import type {ChangeDataCaptureEvent} from '../../parser';
import {combineFragments} from '../fragments/combine-fragments';
import type {LambdaInput} from '../fragments/lambda';
import {metadata, writeLambda} from '../fragments/lambda';
import {makeLogGroup} from '../fragments/log-group';

export interface MakeHandlerOptions extends LambdaInput {
  readonly actionsModuleId: string;
  readonly event: ChangeDataCaptureEvent;
  readonly handlerModuleId: string;
  readonly sourceModelName: string;
  readonly targetTable: string;
  readonly tableName: string;
  readonly typeName: string;
}

/** generate the dispatcher lambda function */
export function makeHandler({
  actionsModuleId,
  codeUri,
  event,
  functionName,
  dependenciesModuleId,
  handlerModuleId,
  outputPath,
  libImportPath,
  sourceModelName,
  tableName,
  targetTable,
  typeName,
}: MakeHandlerOptions) {
  // Account for the fact that the parser only knows the module id, not produced
  // directory layout
  dependenciesModuleId = dependenciesModuleId.startsWith('.')
    ? path.join('..', dependenciesModuleId)
    : dependenciesModuleId;

  handlerModuleId = handlerModuleId.startsWith('.')
    ? path.join('..', handlerModuleId)
    : handlerModuleId;

  writeLambda(
    outputPath,
    `// This file is generated. Do not edit by hand.

import {assert, makeModelChangeHandler} from '${libImportPath}';

import * as dependencies from '${dependenciesModuleId}';
import {handler as cdcHandler} from '${handlerModuleId}';
import {unmarshall${typeName}} from '${actionsModuleId}';

export const handler = makeModelChangeHandler(dependencies, (record) => {
  assert(record.dynamodb.NewImage, 'Expected DynamoDB Record to have a NewImage');
  return cdcHandler(unmarshall${typeName}(record.dynamodb.NewImage));
});
`
  );

  return combineFragments(makeLogGroup({functionName}), {
    resources: {
      [`${functionName}DLQ`]: {
        Properties: {
          KmsMasterKeyId: 'alias/aws/sqs',
        },
        Type: 'AWS::SQS::Queue',
      },
      [`${functionName}EventBridgeDLQ`]: {
        Properties: {
          KmsMasterKeyId: 'alias/aws/sqs',
        },
        Type: 'AWS::SQS::Queue',
      },
      [functionName]: {
        Metadata: metadata,
        Properties: {
          CodeUri: codeUri,
          DeadLetterQueue: {
            TargetArn: {
              'Fn::GetAtt': [`${functionName}EventBridgeDLQ`, 'Arn'],
            },
            Type: 'SQS',
          },
          Events: {
            [event]: {
              Properties: {
                DeadLetterConfig: {
                  Arn: {'Fn::GetAtt': [`${functionName}DLQ`, 'Arn']},
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
                  'Fn::GetAtt': [`${functionName}DLQ`, 'QueueName'],
                },
              },
            },
          ],
        },
        Type: 'AWS::Serverless::Function',
      },
    },
  });
}
