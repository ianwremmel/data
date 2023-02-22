import {SpanKind} from '@opentelemetry/api';
import type {Context, DynamoDBRecord, EventBridgeHandler} from 'aws-lambda';

import type {WithTelemetry} from '../../dependencies';
import {makeLambdaOTelAttributes} from '../telemetry';

import type {UnmarshalledDynamoDBRecord} from './unmarshall-record';
import {unmarshallRecord} from './unmarshall-record';

export type Callback = (
  record: UnmarshalledDynamoDBRecord,
  context: Context
) => Promise<void>;

export type Handler = EventBridgeHandler<
  Exclude<DynamoDBRecord['eventName'], undefined> | string,
  DynamoDBRecord,
  unknown
>;

/** Makes a handler the dispatched event from a DynamoDB Stream. */
export function makeEventBridgeHandler(
  dependencies: WithTelemetry,
  cb: Callback
): Handler {
  const {captureAsyncFunction, captureAsyncRootFunction} = dependencies;
  return captureAsyncRootFunction(async (event, context) =>
    captureAsyncFunction(
      `${event.resources[0]} process`,
      makeLambdaOTelAttributes(context),
      SpanKind.CONSUMER,
      async () => {
        const ddbRecord = event.detail;
        const unmarshalledRecord = unmarshallRecord(ddbRecord);
        // Long run, the cb should return the payload and this code should
        // update it, but I don't know that I want to deal with getting the
        // appropriate create* method passed in here right now.
        await cb(unmarshalledRecord, context);
      }
    )
  );
}
