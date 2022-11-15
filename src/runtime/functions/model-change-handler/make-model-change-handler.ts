import {Context, DynamoDBRecord, EventBridgeHandler} from 'aws-lambda';

import {WithTelemetry} from '../../dependencies';
import {makeLambdaOTelAttributes} from '../telemetry';

import {
  UnmarshalledDynamoDBRecord,
  unmarshallRecord,
} from './unmarshall-record';

type Handler = (
  record: UnmarshalledDynamoDBRecord,
  context: Context
) => Promise<void>;

/**
 * Makes an SQS handler that expects the payload to be a DynamoDB Stream Record.
 */
export function makeModelChangeHandler(
  dependencies: WithTelemetry,
  cb: Handler
): EventBridgeHandler<
  Exclude<DynamoDBRecord['eventName'], undefined> | string,
  DynamoDBRecord,
  any
> {
  const {captureAsyncFunction} = dependencies;
  return async (event, context) =>
    captureAsyncFunction(
      `${event.resources[0]} process`,
      makeLambdaOTelAttributes(context),
      async () => {
        const ddbRecord = event.detail;
        const unmarshalledRecord = unmarshallRecord(ddbRecord);
        // Long run, the cb should return the payload and this code should
        // update it, but I don't know that I want to deal with getting the
        // appropriate create* method passed in here right now.
        await cb(unmarshalledRecord, context);
      }
    );
}
