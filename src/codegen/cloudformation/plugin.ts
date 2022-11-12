import {readFileSync} from 'fs';
import path from 'path';

import {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';
import {assertObjectType, GraphQLObjectType, isObjectType} from 'graphql';
import yml from 'js-yaml';
import {snakeCase} from 'lodash';

import {extractTtlInfo} from '../common/fields';
import {hasDirective, hasInterface} from '../common/helpers';
import {extractIndexInfo} from '../common/indexes';

import {CloudformationPluginConfig} from './config';

/** @override */
export function addToSchema(): AddToSchemaResult {
  return readFileSync(path.resolve(__dirname, '../schema.graphqls'), 'utf8');
}

/** @override */
export const plugin: PluginFunction<CloudformationPluginConfig> = (schema) => {
  try {
    const typesMap = schema.getTypeMap();

    const tableTypes = Object.keys(typesMap)
      .filter((typeName) => {
        const type = typesMap[typeName];
        return isObjectType(type) && hasInterface('Model', type);
      })
      .map((typeName) => {
        const objType = typesMap[typeName];
        assertObjectType(objType);
        return objType as GraphQLObjectType;
      });

    const tableNames = tableTypes.map((type) => type.name).sort();

    // Eventually, this should modify an existing file by using Guard comments
    // and adding/replacing sections as relevant, but for now, we'll just do the
    // basic generation to prove the concept

    const tpl = {
      AWSTemplateFormatVersion: '2010-09-09',
      Transform: 'AWS::Serverless-2016-10-31',
      // eslint-disable-next-line sort-keys
      Conditions: {
        IsProd: {'Fn::Equals': [{Ref: 'StageName'}, 'production']},
      },
      Globals: {
        Function: {
          Environment: {
            Variables: tableNames.reduce((acc, tableName) => {
              acc[`TABLE_${snakeCase(tableName).toUpperCase()}`] = {
                Ref: `Table${tableName}`,
              };
              return acc;
            }, {} as Record<string, {Ref: string}>),
          },
        },
      },
      Outputs: tableNames.reduce((acc, name) => {
        const tableName = `Table${name}`;
        acc[tableName] = {
          Description: `The name of the DynamoDB table for ${name}`,
          Export: {
            Name: {'Fn::Sub': `\${AWS::StackName}-${tableName}`},
            Value: {Ref: tableName},
          },
          Value: {Ref: tableName},
        };
        return acc;
      }, {} as Record<string, object>),
      Parameters: {
        StageName: {
          Type: 'String',
          // eslint-disable-next-line sort-keys
          AllowedValues: ['development', 'production', 'test'],
          Description: 'The name of the stage',
          // eslint-disable-next-line sort-keys
          Default: 'development',
        },
      },
      Resources: tableTypes.reduce((acc, type) => {
        const tableName = `Table${type.name}`;

        assertObjectType(type);
        const isCompositeKey = hasDirective(`compositeKey`, type);
        const indexInfo = extractIndexInfo(type);
        const ttlInfo = extractTtlInfo(type);

        const attributeDefinitions = isCompositeKey
          ? [
              {
                AttributeName: 'pk',
                AttributeType: 'S',
              },
              {
                AttributeName: 'sk',
                AttributeType: 'S',
              },
            ]
          : [{AttributeName: 'id', AttributeType: 'S'}];

        const keySchema = isCompositeKey
          ? [
              {
                AttributeName: 'pk',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'sk',
                KeyType: 'RANGE',
              },
            ]
          : [
              {
                AttributeName: 'id',
                KeyType: 'HASH',
              },
            ];

        const globalSecondaryIndexes = [];
        for (const index of indexInfo.indexes) {
          attributeDefinitions.push(
            {
              AttributeName: `${index.name}pk`,
              AttributeType: 'S',
            },
            {
              AttributeName: `${index.name}sk`,
              AttributeType: 'S',
            }
          );

          globalSecondaryIndexes.push({
            IndexName: index.name,
            KeySchema: [
              {
                AttributeName: `${index.name}pk`,
                KeyType: 'HASH',
              },
              {
                AttributeName: `${index.name}sk`,
                KeyType: 'RANGE',
              },
            ],
            Projection: {
              ProjectionType: 'ALL',
            },
          });
        }

        const properties: Record<string, unknown> = {
          AttributeDefinitions: attributeDefinitions,
          BillingMode: 'PAY_PER_REQUEST',
          GlobalSecondaryIndexes: globalSecondaryIndexes,
          KeySchema: keySchema,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
          SSESpecification: {
            SSEEnabled: {'Fn::If': ['IsProd', true, false]},
          },
          StreamSpecification: {
            StreamViewType: 'NEW_AND_OLD_IMAGES',
          },
          Tags: [
            {
              Key: 'StageName',
              Value: {Ref: 'StageName'},
            },
            {
              Key: 'TableName',
              Value: tableName,
            },
          ],
          TimeToLiveSpecification: {
            AttributeName: 'ttl',
            Enabled: true,
          },
        };

        if (globalSecondaryIndexes.length === 0) {
          delete properties.GlobalSecondaryIndexes;
        }

        if (!ttlInfo) {
          delete properties.TimeToLiveSpecification;
        }

        acc[tableName] = {
          Type: 'AWS::DynamoDB::Table',
          // eslint-disable-next-line sort-keys
          Properties: properties,
        };

        return acc;
      }, {} as Record<string, object>),
    };

    return yml.dump(tpl);
  } catch (err) {
    // graphql-codegen suppresses stack traces, so we have to re-log here.
    console.error(err);
    throw err;
  }
};
