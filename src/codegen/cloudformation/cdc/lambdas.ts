import {filterNull} from '../../common/filters';
import type {ChangeDataCaptureEvent, HandlerConfig} from '../../parser';
import {makeHandlerAlarms} from '../alarms';
import {combineFragments} from '../fragments/combine-fragments';
import type {LambdaInput} from '../fragments/lambda';
import {writeLambda} from '../fragments/lambda';
import {makeLogGroup} from '../fragments/log-group';

export interface MakeHandlerOptions extends LambdaInput {
  readonly event: ChangeDataCaptureEvent;
  readonly handlerConfig: HandlerConfig;
  readonly readableTables: readonly string[];
  readonly sourceModelName: string;
  readonly tableName: string;
  readonly template: string;
  readonly writableTables: readonly string[];
}

/** generate the dispatcher lambda function */
export function makeHandler({
  buildProperties,
  codeUri,
  handlerConfig,
  event,
  functionName,
  outputPath,
  readableTables,
  sourceModelName,
  tableName,
  template,
  writableTables,
}: MakeHandlerOptions) {
  writeLambda(outputPath, template);

  const {timeout, memorySize} = handlerConfig;

  // this is the queue that the function listens to that eventbridge writes to
  const q = `${functionName}Queue`;

  // this is the queue that where messages go if they fail to be processed by
  // the function
  const dlq = `${functionName}DLQ`;

  // dispatcher -> eventbridge
  // eventbridge -> sqs queue
  // sqs queue -> handler, dlq
  const rule = `${functionName}Rule`;

  return combineFragments(
    makeLogGroup({functionName}),
    makeHandlerAlarms(functionName, handlerConfig),
    {
      resources: {
        [dlq]: {
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
            Events: {
              Stream: {
                Properties: {
                  BatchSize: 10,
                  FunctionResponseTypes: ['ReportBatchItemFailures'],
                  Queue: {'Fn::GetAtt': [q, 'Arn']},
                },
                Type: 'SQS',
              },
            },
            MemorySize: memorySize,
            Policies: [
              'AWSLambdaBasicExecutionRole',
              'AWSLambda_ReadOnlyAccess',
              'AWSXrayWriteOnlyAccess',
              'CloudWatchLambdaInsightsExecutionRolePolicy',
              {CloudWatchPutMetricPolicy: {}},
              ...readableTables.map((targetTable) => ({
                DynamoDBReadPolicy: {
                  TableName: {Ref: targetTable},
                },
              })),
              ...writableTables.map((targetTable) => ({
                DynamoDBCrudPolicy: {
                  TableName: {Ref: targetTable},
                },
              })),
              {
                SQSSendMessagePolicy: {
                  QueueName: {
                    'Fn::GetAtt': [`${functionName}DLQ`, 'QueueName'],
                  },
                },
              },
            ].filter(filterNull),
            Timeout: timeout,
          },
          Type: 'AWS::Serverless::Function',
        },
        [q]: {
          Properties: {
            KmsMasterKeyId: 'alias/aws/sqs',
            RedrivePolicy: {
              deadLetterTargetArn: {
                'Fn::GetAtt': [dlq, 'Arn'],
              },
              maxReceiveCount: 3,
            },
            VisibilityTimeout: 320,
          },
          Type: 'AWS::SQS::Queue',
        },
        [`${q}Policy`]: {
          Properties: {
            PolicyDocument: {
              Statement: [
                {
                  Action: ['sqs:SendMessage'],
                  Condition: {
                    ArnEquals: {
                      'aws:SourceArn': {
                        'Fn::GetAtt': [rule, 'Arn'],
                      },
                    },
                  },
                  Effect: 'Allow',
                  Principal: {
                    Service: 'events.amazonaws.com',
                  },
                  Resource: {
                    'Fn::GetAtt': [q, 'Arn'],
                  },
                  Sid: 'Allow EventBridge to send messages to the queue',
                },
              ],
            },
            Queues: [{Ref: q}],
          },
          Type: 'AWS::SQS::QueuePolicy',
        },
        [rule]: {
          Properties: {
            EventBusName: 'default',
            EventPattern: {
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
            Targets: [
              {
                Arn: {'Fn::GetAtt': [q, 'Arn']},
                Id: functionName,
              },
            ],
          },
          Type: 'AWS::Events::Rule',
        },
      },
    }
  );
}
