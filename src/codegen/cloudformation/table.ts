import {snakeCase} from 'lodash';

import type {Table} from '../parser';

import type {CloudFormationFragment} from './types';

/* eslint-disable complexity */
/** cloudformation generator */
export function defineTable({
  enablePointInTimeRecovery,
  enableStreaming,
  hasTtl,
  tableName,
  primaryKey: {isComposite},
  secondaryIndexes,
}: Table): CloudFormationFragment {
  const attributeDefinitions = isComposite
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

  const keySchema = isComposite
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

  for (const index of secondaryIndexes) {
    if (index.type === 'gsi') {
      attributeDefinitions.push(
        ...(index.isComposite
          ? [
              {
                AttributeName: `${index.name}pk`,
                AttributeType: 'S',
              },
              {
                AttributeName: `${index.name}sk`,
                AttributeType: 'S',
              },
            ]
          : [
              {
                AttributeName:
                  index.name === 'publicId' ? 'publicId' : `${index.name}pk`,
                AttributeType: 'S',
              },
            ])
      );
      const gsiKeySchema = index.isComposite
        ? [
            {
              AttributeName: `${index.name}pk`,
              KeyType: 'HASH',
            },
            {
              AttributeName: `${index.name}sk`,
              KeyType: 'RANGE',
            },
          ]
        : [
            {
              AttributeName:
                index.name === 'publicId' ? 'publicId' : `${index.name}pk`,
              KeyType: 'HASH',
            },
          ];
      globalSecondaryIndexes.push({
        IndexName: index.name,
        KeySchema: gsiKeySchema,
        Projection: {
          ProjectionType: 'ALL',
        },
      });
    } else if (index.type === 'lsi') {
      attributeDefinitions.push({
        AttributeName: `${index.name}sk`,
        AttributeType: 'S',
      });
      const lsiKeySchema = [
        {
          AttributeName: 'pk',
          KeyType: 'HASH',
        },
        {
          AttributeName: `${index.name}sk`,
          KeyType: 'RANGE',
        },
      ];
      localSecondaryIndexes.push({
        IndexName: index.name,
        KeySchema: lsiKeySchema,
        Projection: {
          ProjectionType: 'ALL',
        },
      });
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
          PointInTimeRecoveryEnabled: {'Fn::If': ['IsProd', true, false]},
        }
      : undefined,
    SSESpecification: {
      SSEEnabled: {'Fn::If': ['IsProd', true, false]},
    },
    StreamSpecification: enableStreaming
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

  if (!hasTtl) {
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
        Description: `The name of the DynamoDB table for ${tableName}`,
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
