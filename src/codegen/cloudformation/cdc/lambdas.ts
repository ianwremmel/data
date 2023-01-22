import {filterNull} from '../../common/filters';
import type {ChangeDataCaptureEvent} from '../../parser';
import {combineFragments} from '../fragments/combine-fragments';
import type {LambdaInput} from '../fragments/lambda';
import {writeLambda} from '../fragments/lambda';
import {makeLogGroup} from '../fragments/log-group';

export interface MakeHandlerOptions extends LambdaInput {
  readonly event: ChangeDataCaptureEvent;
  readonly sourceModelName: string;
  readonly tableName: string;
  readonly targetTable?: string;
  readonly template: string;
}

/** generate the dispatcher lambda function */
export function makeHandler({
  buildProperties,
  codeUri,
  event,
  functionName,
  outputPath,
  sourceModelName,
  tableName,
  targetTable,
  template,
}: MakeHandlerOptions) {
  writeLambda(outputPath, template);

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
        Metadata: {
          BuildMethod: 'esbuild',
          BuildProperties: buildProperties,
        },
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
            targetTable && {
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
          ].filter(filterNull),
        },
        Type: 'AWS::Serverless::Function',
      },
    },
  });
}
