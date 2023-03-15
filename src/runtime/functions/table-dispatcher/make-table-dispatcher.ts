import {PutEventsCommand} from '@aws-sdk/client-eventbridge';
import {handleDynamoDBStreamEvent} from '@code-like-a-carpenter/lambda-handlers';
import type {DynamoDBRecord, DynamoDBStreamHandler} from 'aws-lambda';

import type {WithEventBridge, WithTableName} from '../../dependencies';

/** Processes a single DynamoDB record. */
async function handleRecord(
  {eventBridge, tableName}: WithEventBridge & WithTableName,
  record: DynamoDBRecord
) {
  const modelName = record.dynamodb?.NewImage?._et.S;

  const entry = {
    Detail: JSON.stringify(record),
    DetailType: record.eventName,
    Resources: record.eventSourceARN
      ? [record.eventSourceARN.split('/stream')[0]]
      : [],
    Source: [tableName, modelName].join('.'),
    Time: record.dynamodb?.ApproximateCreationDateTime
      ? new Date(record.dynamodb.ApproximateCreationDateTime)
      : undefined,
  };

  await eventBridge.send(
    new PutEventsCommand({
      Entries: [entry],
    })
  );
}

/** Factory for creating a table dispatcher. */
export function makeDynamoDBStreamDispatcher(
  dependencies: WithEventBridge & WithTableName
): DynamoDBStreamHandler {
  return handleDynamoDBStreamEvent(
    async (record) => await handleRecord(dependencies, record)
  );
}
