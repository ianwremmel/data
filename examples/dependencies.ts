// Create service client module using ES6 syntax.
import http from 'http';
import https from 'https';

import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {EventBridgeClient} from '@aws-sdk/client-eventbridge';
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb';
import {
  captureAWSv3Client,
  captureHTTPsGlobal,
  captureAsyncFunc,
  getSegment,
} from 'aws-xray-sdk-core';

// Pre SDKv3, XRay could safely run anywhere and just no-opped if it wasn't
// inside a Lambda. Now, we have to decide to no-op manually.
const isRunningInLambda =
  typeof process.env.AWS_LAMBDA_FUNCTION_NAME !== 'undefined';

if (isRunningInLambda) {
  captureHTTPsGlobal(https);
  captureHTTPsGlobal(http);
}

const _ddb = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT,
});
export const ddb: DynamoDBClient = isRunningInLambda
  ? captureAWSv3Client(_ddb as any)
  : _ddb;

const _eventBridge = new EventBridgeClient({
  endpoint: process.env.AWS_ENDPOINT,
});
export const eventBridge: EventBridgeClient = isRunningInLambda
  ? captureAWSv3Client(_eventBridge as any)
  : _eventBridge;

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

/** From WithTelemetry */
export function captureException(err: unknown) {
  if (err instanceof Error) {
    getSegment()?.addError(err);
  } else {
    getSegment()?.addError(JSON.stringify(err));
  }
}

/** From WithTelemetry */
export async function captureAsyncFunction<R>(
  name: string,
  attributes: Record<string, boolean | number | string | undefined>,
  fn: () => Promise<R>
): Promise<R> {
  return captureAsyncFunc(name, async (subsegment) => {
    try {
      return await fn();
    } finally {
      subsegment?.close();
    }
  });
}
