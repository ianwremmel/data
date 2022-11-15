import {PutEventsCommand} from '@aws-sdk/client-eventbridge';
import {Context, DynamoDBRecord, DynamoDBStreamHandler} from 'aws-lambda';

import {
  WithEventBridge,
  WithModelName,
  WithTableName,
  WithTelemetry,
} from '../../dependencies';
import {makeLambdaOTelAttributes} from '../telemetry';

/** Processes a single DynamoDB record. */
async function handleRecord(
  {
    captureException,
    eventBridge,
    modelName,
    tableName,
  }: WithEventBridge & WithModelName & WithTableName & WithTelemetry,
  record: DynamoDBRecord,
  context: Context,
  batchItemFailures: string[]
) {
  try {
    await eventBridge.send(
      new PutEventsCommand({
        Entries: [
          {
            Detail: JSON.stringify(record),
            DetailType: record.eventName,
            Resources: record.eventSourceARN
              ? [record.eventSourceARN.split('/stream')[0]]
              : [],
            Source: `${tableName}.${modelName}`,
            Time: record.dynamodb?.ApproximateCreationDateTime
              ? new Date(record.dynamodb.ApproximateCreationDateTime)
              : undefined,
          },
        ],
      })
    );
  } catch (err) {
    captureException(err);

    if (!record.dynamodb?.SequenceNumber) {
      const err2 = new Error(
        'Missing SequenceNumber. Did you forget to set FunctionResponseTypes in your CloudFormation template?'
      );
      captureException(err2);
      throw err2;
    }

    batchItemFailures.push(record.dynamodb.SequenceNumber);
  }
}

/** Factory for creating a table dispatcher. */
export function makeDynamoDBStreamDispatcher(
  dependencies: WithEventBridge & WithModelName & WithTableName & WithTelemetry
): DynamoDBStreamHandler {
  const {captureAsyncFunction} = dependencies;
  return async (event, context) =>
    captureAsyncFunction(
      'aws:dynamodb process record',
      makeLambdaOTelAttributes(context),
      async () => {
        const batchItemFailures: string[] = [];

        const promises = event.Records.map(
          async (record) =>
            await dependencies.captureAsyncFunction(
              'aws:dynamodb process record',
              {
                'faas.document.collection':
                  record.eventSourceARN?.split('/')[1],
                'faas.document.name': JSON.stringify(record.dynamodb?.Keys),
                'faas.document.operation': record.eventName?.toLowerCase(),
                'faas.document.time':
                  record.dynamodb?.ApproximateCreationDateTime,
                'faas.trigger': 'datasource',
              },
              () =>
                handleRecord(dependencies, record, context, batchItemFailures)
            )
        );

        // handleRecord should take care of capturing add suppressing any
        // processing errors and sending  them to the appropriate
        // XRay/OTel/Segment service, however we want to bubble up any other
        // errors (for example, missing AWS payload pieces).
        await Promise.all(promises);

        return {
          batchItemFailures: batchItemFailures.map((id) => ({
            itemIdentifier: id,
          })),
        };
      }
    );
}
