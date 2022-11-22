import assert from 'assert';
import path from 'path';

import type {GraphQLObjectType, GraphQLSchema} from 'graphql';
import {kebabCase} from 'lodash';

import {
  getArgStringValue,
  getDirective,
  hasDirective,
} from '../../common/helpers';
import type {CloudformationPluginConfig} from '../config';
import {combineFragments} from '../fragments/combine-fragments';
import {metadata} from '../fragments/lambda';
import {makeLogGroup} from '../fragments/log-group';
import {makeTableDispatcher} from '../fragments/table-dispatcher';
import type {CloudFormationFragment} from '../types';

import {makeHandler} from './lambdas';

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

  const handlerFilename = `handler-${kebabCase(modelName)}`;
  makeHandler({
    actionsModuleId: path.relative(info.outputFile, config.actionsModuleId),
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

  const handler = {
    resources: {
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
        Metadata: metadata,
      },
    },
  };

  return combineFragments(
    makeTableDispatcher({
      dependenciesModuleId,
      libImportPath,
      outDir: info.outputFile,
      tableName,
    }),
    makeLogGroup({functionName: handlerFunctionName}),
    handler
  );
}
