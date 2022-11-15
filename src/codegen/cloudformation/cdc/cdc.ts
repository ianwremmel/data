import assert from 'assert';
import path from 'path';

import {GraphQLObjectType, GraphQLSchema} from 'graphql';
import {kebabCase} from 'lodash';

import {
  getArgStringValue,
  getDirective,
  hasDirective,
} from '../../common/helpers';
import {CloudformationPluginConfig} from '../config';
import {CloudFormationFragment} from '../types';

import {makeHandler, makeTableDispatcher} from './lambdas';

/** Generates CDC config for a type */
export function defineCdc(
  schema: GraphQLSchema,
  config: CloudformationPluginConfig,
  type: GraphQLObjectType,
  info: {outputFile: string}
): CloudFormationFragment {
  if (!hasDirective('cdc', type)) {
    return {};
  }
  const directive = getDirective('cdc', type);

  const event = getArgStringValue('event', directive);

  const isExample = !!process.env.IS_EXAMPLE;
  const libImportPath = isExample ? '../../../..' : '@ianwremmel/data';

  const typeName = type.name;

  const modelName = typeName;
  const tableName = `Table${typeName}`;

  const produces = getArgStringValue('produces', directive);
  const targetModel = schema.getType(produces);
  assert(
    targetModel,
    `\`produces\` arg on @cdc for ${modelName} identifies ${produces}, which does not appear to identify a type`
  );
  const destinationTable = produces;

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

  const handlerPath = getArgStringValue('handler', directive);
  const handlerFunctionName = `${modelName}CDCHandler`;

  makeTableDispatcher({
    dependenciesModuleId,
    libImportPath,
    modelName,
    outDir: path.join(path.dirname(info.outputFile), dispatcherFilename),
    tableName,
  });

  const handlerFilename = `handler-${kebabCase(modelName)}`;
  makeHandler({
    dependenciesModuleId,
    // add an extra level of nesting because we know we're putting the generated
    // file in a folder.
    handlerPath: handlerPath.startsWith('.')
      ? path.join('..', handlerPath)
      : handlerPath,
    libImportPath,
    outDir: path.join(path.dirname(info.outputFile), handlerFilename),
    type,
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
      [`${handlerFunctionName}DLQ`]: {
        Type: 'AWS::SQS::Queue',
        // eslint-disable-next-line sort-keys
        Properties: {
          KmsMasterKeyId: 'alias/aws/sqs',
        },
      },
      [`${handlerFunctionName}EventBridgeDLQ`]: {
        Type: 'AWS::SQS::Queue',
        // eslint-disable-next-line sort-keys
        Properties: {
          KmsMasterKeyId: 'alias/aws/sqs',
        },
      },
      [handlerFunctionName]: {
        Type: 'AWS::Serverless::Function',
        // eslint-disable-next-line sort-keys
        Properties: {
          CodeUri: handlerFilename,
          DeadLetterQueue: {
            TargetArn: {
              'Fn::GetAtt': [`${handlerFunctionName}EventBridgeDLQ`, 'Arn'],
            },
            Type: 'SQS',
          },
          Events: {
            [event]: {
              Type: 'EventBridgeRule',
              // eslint-disable-next-line sort-keys
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
                          S: [`${modelName}`],
                        },
                      },
                    },
                  },
                  'detail-type':
                    event === 'UPSERT' ? ['INSERT', 'MODIFY'] : [event],
                  resources: [{'Fn::GetAtt': [tableName, 'Arn']}],
                  source: [`${tableName}.${modelName}`],
                },
              },
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
                TableName: {Ref: `Table${destinationTable}`},
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
