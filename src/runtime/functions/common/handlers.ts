import {parallelMap} from '@code-like-a-carpenter/parallel';
import {runWithNewSpan} from '@code-like-a-carpenter/telemetry';
import type {Link} from '@opentelemetry/api';
import {
  context as contextAPI,
  propagation,
  SpanKind,
  trace,
} from '@opentelemetry/api';
import type {Context, SQSHandler, SQSRecord} from 'aws-lambda';

import {assert} from '../../assert';
import type {WithTelemetry} from '../../dependencies';
import {makeLambdaOTelAttributes} from '../telemetry';

import {retry} from './retry';
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
  const {captureAsyncRootFunction, captureException} = dependencies;

  return captureAsyncRootFunction(async (event, context) => {
    const links = new Map<SQSRecord, Link>();
    const eventSources = new Set<string>();

    for (const record of event.Records) {
      const traceHeader = record.messageAttributes?.AWSTraceHeader?.stringValue;
      if (traceHeader) {
        const ctx = propagation.extract(contextAPI.active(), traceHeader);
        const spanCtx = trace.getSpanContext(ctx);
        if (spanCtx) {
          links.set(record, {context: spanCtx});
        }
      }
      eventSources.add(record.eventSource);
    }

    const eventSource =
      eventSources.size === 1
        ? event.Records[0].eventSource
        : 'multiple_sources';

    return runWithNewSpan(
      `${eventSource} process`,
      {
        attributes: {
          ...makeLambdaOTelAttributes(context),
          'faas.trigger': 'pubsub',
          'message.operation': 'process',
          'message.source.kind': 'queue',
          'message.system': 'AmazonSQS',
        },
        kind: SpanKind.CONSUMER,
        links: Array.from(links.values()),
      },
      async () => {
        const results = await parallelMap(event.Records, async (record) => {
          await runWithNewSpan(
            `${eventSource} process`,
            {
              attributes: {
                'faas.trigger': 'pubsub',
                'message.operation': 'process',
                'message.source.kind': 'queue',
                'message.system': 'AmazonSQS',
              },
              kind: SpanKind.CONSUMER,
              links: links.has(record) ? [links.get(record)!] : [],
            },
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
                return await retry(() => cb(unmarshalledRecord, context));
              } catch (err) {
                // Technically this exception is escaping the span, but only for
                // use in crafting batchItemFailures. At this point, it's been
                // "handled".
                captureException(err, false);
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
