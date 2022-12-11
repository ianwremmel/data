import type {GraphQLObjectType} from 'graphql';
import {assertObjectType} from 'graphql';
import {snakeCase} from 'lodash';

import {extractTtlInfo} from '../common/fields';
import {
  getOptionalArgBooleanValue,
  getOptionalDirective,
  hasDirective,
} from '../common/helpers';
import {extractIndexInfo} from '../common/indexes';
import {extractTableName} from '../common/objects';

import type {CloudFormationFragment} from './types';

/* eslint-disable complexity */
/** cloudformation generator */
export function defineTable(type: GraphQLObjectType): CloudFormationFragment {
  const tableName = extractTableName(type);
  const tableDirective = getOptionalDirective('table', type);
  const enablePointInTimeRecovery = tableDirective
    ? getOptionalArgBooleanValue(
        'enablePointInTimeRecovery',
        tableDirective
      ) !== false
    : true;

  assertObjectType(type);
  const isCompositeKey = hasDirective(`compositeKey`, type);
  const indexInfo = extractIndexInfo(type);
  const ttlInfo = extractTtlInfo(type);
  const hasCdc = hasDirective('cdc', type);

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
    : [{AttributeName: 'pk', AttributeType: 'S'}];

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
          AttributeName: 'pk',
          KeyType: 'HASH',
        },
      ];

  const globalSecondaryIndexes = [];
  const localSecondaryIndexes = [];
  for (const index of indexInfo.indexes) {
    if ('name' in index) {
      if ('pkFields' in index) {
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
      } else {
        attributeDefinitions.push({
          AttributeName: index.name,
          AttributeType: 'S',
        });
      }

      if ('pkFields' in index) {
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
      } else if ('skFields' in index) {
        localSecondaryIndexes.push({
          IndexName: index.name,
          KeySchema: [
            {
              AttributeName: 'pk',
              KeyType: 'HASH',
            },
            {
              AttributeName: index.name,
              KeyType: 'RANGE',
            },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
        });
      }
    }
  }

  const properties: Record<string, unknown> = {
    AttributeDefinitions: attributeDefinitions,
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: globalSecondaryIndexes.length
      ? globalSecondaryIndexes
      : undefined,
    KeySchema: keySchema,
    LocalSecondaryIndexes: localSecondaryIndexes.length
      ? localSecondaryIndexes
      : undefined,
    PointInTimeRecoverySpecification: enablePointInTimeRecovery
      ? {
          PointInTimeRecoveryEnabled: true,
        }
      : undefined,
    SSESpecification: {
      SSEEnabled: {'Fn::If': ['IsProd', true, false]},
    },
    StreamSpecification: hasCdc
      ? {
          StreamViewType: 'NEW_AND_OLD_IMAGES',
        }
      : undefined,
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

  const resource = {
    Properties: properties,
    Type: 'AWS::DynamoDB::Table',
  };

  return {
    conditions: {
      IsProd: {'Fn::Equals': [{Ref: 'StageName'}, 'production']},
    },
    env: {[`${snakeCase(tableName).toUpperCase()}`]: {Ref: tableName}},
    output: {
      [tableName]: {
        Description: `The name of the DynamoDB table for ${type.name}`,
        Export: {
          Name: {'Fn::Sub': `\${AWS::StackName}-${tableName}`},
          Value: {Ref: tableName},
        },
        Value: {Ref: tableName},
      },
    },
    resources: {
      [tableName]: resource,
    },
  };
}

/* eslint-enable complexity */
