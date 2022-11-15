// Create service client module using ES6 syntax.
import http from 'http';
import https from 'https';

import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb';
import {captureAWSv3Client, captureHTTPsGlobal} from 'aws-xray-sdk-core';

captureHTTPsGlobal(http);
captureHTTPsGlobal(https);

export const ddb: DynamoDBClient = captureAWSv3Client(
  new DynamoDBClient({
    endpoint: process.env.AWS_ENDPOINT,
  }) as any
);

const marshallOptions = {
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false, // false, by default.
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: false, // false, by default.
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
};

const translateConfig = {marshallOptions, unmarshallOptions};

// Create the DynamoDB Document client.
export const ddbDocClient = DynamoDBDocumentClient.from(ddb, translateConfig);
