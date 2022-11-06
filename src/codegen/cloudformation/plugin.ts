import {readFileSync} from 'fs';
import path from 'path';

import {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';
import {assertObjectType, GraphQLObjectType, isObjectType} from 'graphql';
import {snakeCase} from 'lodash';

import {hasDirective, hasInterface} from '../common/helpers';

import {CloudformationPluginConfig} from './config';

/** @override */
export function addToSchema(): AddToSchemaResult {
  return readFileSync(path.resolve(__dirname, '../schema.graphqls'), 'utf8');
}

/** @override */
export const plugin: PluginFunction<CloudformationPluginConfig> = (schema) => {
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

  // Eventually, this should modifiy an existing file by using Guard comments
  // and adding/replacing sections as relevant, but for now, we'll just do the
  // basic generation to prove the concept
  return `AWSTemplateFormatVersion: '2010-09-09'
Transform: 'AWS::Serverless-2016-10-31'

Conditions:
  IsProd: !Equals
    - !Ref StageName
    - production

Globals:
  Function:
    Environment:
      Variables:
        ### Generated Table Name Environment Variables ###
${tableNames
  .map(
    (tableName) =>
      `        TABLE_${snakeCase(
        tableName
      ).toUpperCase()}: !Ref Table${tableName}`
  )
  .join('\n')}
        ### End Generated Table Name Environment Variables ###

Outputs:
  ### Generated Table Name Outputs ###
${tableNames
  .map(
    (typeName) => `  Table${typeName}:
    Description: The name of the DynamoDB table for ${typeName}
    Value: !Ref Table${typeName}
    Export:
      Name: !Sub \${AWS::StackName}-Table${typeName}
      Value: !Ref Table${typeName}`
  )
  .join('\n')}
  ### End Generated Table Name Outputs ###

Parameters:
  StageName:
    Type: String
    Description: The name of the stage
    AllowedValues:
      - development
      - production
      - test
    Default: development

Resources:
  ### Generated Table Resources ###
${tableTypes
  .map((type) => {
    const tableName = `Table${type.name}`;

    assertObjectType(type);
    // Again, I don't know why I need to cast this.
    const isCompositeKey = hasDirective(`compositeKey`, type);

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

    const ttlField =
      type.astNode?.kind === 'ObjectTypeDefinition' &&
      type.astNode.fields?.find((field) =>
        field.directives?.map(({name}) => name.value).includes('ttl')
      )?.name.value;

    return `
  ${tableName}:
    Type: AWS::DynamoDB::Table
    Properties:
      AttributeDefinitions:
${attributeDefinitions
  .map(
    ({
      AttributeName,
      AttributeType,
    }) => `        - AttributeName: ${AttributeName}
          AttributeType: ${AttributeType}`
  )
  .join('\n')}
      BillingMode: PAY_PER_REQUEST
      KeySchema:
${keySchema
  .map(
    ({AttributeName, KeyType}) => `        - AttributeName: ${AttributeName}
          KeyType: ${KeyType}`
  )
  .join('\n')}
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      SSESpecification:
        # Use the customer-owned, AWS-managed KMS key in prod; use the
        # AWS-owned, AWS-managed KMS key in dev and test.
        SSEEnabled: !If
          - IsProd
          - true
          - false
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES
      Tags:
        - Key: StageName
          Value: !Ref StageName
        - Key: TableName
          Value: ${tableName}
      ${
        ttlField
          ? `TimeToLiveSpecification:
          AttributeName: ttl
          Enabled: true`
          : ''
      }`;
  })
  .join('\n')}

  ### End Generated Table Resources ###
    `;
};
