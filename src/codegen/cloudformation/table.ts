import type {GraphQLObjectType} from 'graphql';
import {assertObjectType} from 'graphql/index';
import {snakeCase} from 'lodash';

import {extractTtlInfo} from '../common/fields';
import {hasDirective} from '../common/helpers';
import {extractIndexInfo} from '../common/indexes';

import type {CloudFormationFragment} from './types';

/** cloudformation generator */
export function defineTable(type: GraphQLObjectType): CloudFormationFragment {
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

  const resource = {
    Type: 'AWS::DynamoDB::Table',
    // eslint-disable-next-line sort-keys
    Properties: properties,
  };

  return {
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
