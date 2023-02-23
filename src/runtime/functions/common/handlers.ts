import {parallelMap} from '@code-like-a-carpenter/parallel';
import {SpanKind} from '@opentelemetry/api';
import type {Context, SQSHandler} from 'aws-lambda';

import {assert} from '../../assert';
import type {WithTelemetry} from '../../dependencies';
import {makeLambdaOTelAttributes} from '../telemetry';

import type {UnmarshalledDynamoDBRecord} from './unmarshall-record';
import {unmarshallRecord} from './unmarshall-record';

export type Callback = (
  record: UnmarshalledDynamoDBRecord,
  context: Context
) => Promise<void>;

export type Handler = SQSHandler;

/** Makes a handler the dispatched event from a DynamoDB Stream. */

/** Make a handler for an SQS event */
export function makeSqsHandler(
  dependencies: WithTelemetry,
  cb: Callback
): Handler {
  const {captureAsyncFunction, captureAsyncRootFunction, captureException} =
    dependencies;

  return captureAsyncRootFunction(async (event, context) => {
    const eventSource =
      event.Records.reduce(
        (acc, record) => acc.add(record.eventSource),
        new Set<string>()
      ).size === 1
        ? event.Records[0].eventSource
        : 'multiple_sources';

    // Note that https://opentelemetry.io/docs/reference/specification/trace/semantic_conventions/instrumentation/aws-lambda/#sqs-event
    // indicates that we should attach the event source context as a linked
    // span, but until I remove `captureAsyncFunction` in favor of using OTel
    // directly, that's not practical.
    return captureAsyncFunction(
      `${eventSource} process`,
      {
        ...makeLambdaOTelAttributes(context),
        'faas.trigger': 'pubsub',
        'message.operation': 'process',
        'message.source.kind': 'queue',
        'message.system': 'AmazonSQS',
      },
      SpanKind.CONSUMER,
      async () => {
        const results = await parallelMap(event.Records, async (record) => {
          await captureAsyncFunction(
            `${eventSource} process`,
            {
              'faas.trigger': 'pubsub',
              'message.operation': 'process',
              'message.source.kind': 'queue',
              'message.system': 'AmazonSQS',
            },
            SpanKind.CONSUMER,
            async () => {
              const eventBridgeRecord = JSON.parse(record.body);

              assert(
                'detail' in eventBridgeRecord,
                'EventBridge record is missing "detail" field'
              );
              assert(
                'dynamodb' in eventBridgeRecord.detail,
                'EventBridge record is missing "detail.dynamodb" field'
              );
              const ddbRecord = eventBridgeRecord.detail;

              const unmarshalledRecord = unmarshallRecord(ddbRecord);

              try {
                return await cb(unmarshalledRecord, context);
              } catch (err) {
                captureException(err);
                throw err;
              }
            }
          );
        });

        return {
          batchItemFailures: results
            .filter((result) => result.status === 'rejected')
            .map((result, index) => ({
              itemIdentifier: event.Records[index].messageId,
            })),
        };
      }
    );
  });
}
