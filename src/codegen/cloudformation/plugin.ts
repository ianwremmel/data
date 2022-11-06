import {readFileSync} from 'fs';
import path from 'path';

import {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';
import {assertObjectType} from 'graphql';
import {snakeCase} from 'lodash';

import {CloudformationPluginConfig} from './config';

/** @override */
export function addToSchema(): AddToSchemaResult {
  return readFileSync(path.resolve(__dirname, '../schema.graphqls'), 'utf8');
}

/** @override */
export const plugin: PluginFunction<CloudformationPluginConfig> = (schema) => {
  const typesMap = schema.getTypeMap();

  const simpleTableTypes = Object.keys(typesMap)
    .filter((typeName) => {
      const type = typesMap[typeName];
      const {astNode} = type;

      if (
        astNode?.kind === 'ObjectTypeDefinition' &&
        astNode.interfaces?.map(({name}) => name.value).includes('SimpleModel')
      ) {
        return true;
      }

      return false;
    })
    .map((typeName) => {
      const objType = typesMap[typeName];
      assertObjectType(objType);
      return objType;
    });

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
        ### Generated Simple Table Name Environment Variables ###
${simpleTableTypes
  .map(
    (type) =>
      `        TABLE_${snakeCase(type.name).toUpperCase()}: !Ref Table${
        type.name
      }`
  )
  .join('\n')}
        ### End Generated Simple Table Name Environment Variables ###

Outputs:
  ### Generated Simple Table Name Outputs ###
${simpleTableTypes
  .map(
    (type) => `  Table${type.name}:
    Description: The name of the DynamoDB table for ${type.name}
    Value: !Ref Table${type.name}
    Export:
      Name: !Sub \${AWS::StackName}-Table${type.name}
      Value: !Ref Table${type.name}`
  )
  .join('\n')}
  ### End Generated Simple Table Name Outputs ###

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
  ### Generated Simple Table Resources ###
${simpleTableTypes
  .map((type) => {
    const tableName = `Table${type.name}`;
    const idField = 'id';

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
        - AttributeName: ${idField}
          AttributeType: S
      BillingMode: PAY_PER_REQUEST
      KeySchema:
        - AttributeName: ${idField}
          KeyType: HASH
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
        - Key: TableType
          Value: SimpleTable
      ${
        ttlField &&
        `TimeToLiveSpecification:
          AttributeName: ttl
          Enabled: true`
      }`;
  })
  .join('\n')}

  ### End Generated Simple Table Resources ###
    `;
};
