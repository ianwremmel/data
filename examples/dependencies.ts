// Create service client module using ES6 syntax.
import http from 'http';
import https from 'https';

import {CloudWatchLogsClient} from '@aws-sdk/client-cloudwatch-logs';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {EventBridgeClient} from '@aws-sdk/client-eventbridge';
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb';
import type {SpanKind} from '@opentelemetry/api';
import {
  captureAWSv3Client,
  captureHTTPsGlobal,
  captureAsyncFunc,
  getSegment,
} from 'aws-xray-sdk-core';
import cuid from 'cuid';

/** Figure out the correct URL for lambda to lambda calls. */
function getEndpointUrl() {
  if (process.env.LOCALSTACK_HOSTNAME && process.env.EDGE_PORT) {
    return `http://${process.env.LOCALSTACK_HOSTNAME}:${process.env.EDGE_PORT}`;
  }

  if (process.env.AWS_ENDPOINT) {
    return process.env.AWS_ENDPOINT;
  }

  return undefined;
}

// Pre SDKv3, XRay could safely run anywhere and just no-opped if it wasn't
// inside a Lambda. Now, we have to decide to no-op manually.
const isRunningInLambda =
  typeof process.env.AWS_LAMBDA_FUNCTION_NAME !== 'undefined';

if (isRunningInLambda) {
  captureHTTPsGlobal(https);
  captureHTTPsGlobal(http);
}

const _ddb = new DynamoDBClient({
  endpoint: getEndpointUrl(),
});
export const ddb: DynamoDBClient = isRunningInLambda
  ? captureAWSv3Client(_ddb)
  : _ddb;

const _eventBridge = new EventBridgeClient({
  endpoint: getEndpointUrl(),
});
export const eventBridge: EventBridgeClient = isRunningInLambda
  ? captureAWSv3Client(_eventBridge)
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
  kind: SpanKind,
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

/** Generates unique, random ids */
export function idGenerator() {
  return cuid();
}

const _cw = new CloudWatchLogsClient({
  endpoint: getEndpointUrl(),
});
export const cwc: CloudWatchLogsClient = isRunningInLambda
  ? captureAWSv3Client(_cw)
  : _cw;
