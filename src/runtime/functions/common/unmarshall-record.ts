/** Unmarshalls a DynamoDB record so it can be used like something reasonable */
import type {AttributeValue} from '@aws-sdk/client-dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';
import type {NativeAttributeValue} from '@aws-sdk/util-dynamodb/dist-types/models';
import type {DynamoDBRecord, StreamRecord} from 'aws-lambda';

type UnmarshalledStreamRecord = Omit<StreamRecord, 'NewImage' | 'OldImage'> & {
  NewImage?: Record<string, NativeAttributeValue> | undefined;
  OldImage?: Record<string, NativeAttributeValue> | undefined;
};
export type UnmarshalledDynamoDBRecord = Omit<DynamoDBRecord, 'dynamodb'> & {
  dynamodb: UnmarshalledStreamRecord;
};

/** Unmarshalls a DynamoDB record so it can be used like something reasonable */
export function unmarshallRecord(
  ddbRecord: DynamoDBRecord
): UnmarshalledDynamoDBRecord {
  return {
    ...ddbRecord,
    dynamodb: {
      ...ddbRecord.dynamodb,
      NewImage: ddbRecord.dynamodb?.NewImage
        ? unmarshall(
            ddbRecord.dynamodb.NewImage as Record<string, AttributeValue>
          )
        : undefined,
      OldImage: ddbRecord.dynamodb?.OldImage
        ? unmarshall(
            ddbRecord.dynamodb.OldImage as Record<string, AttributeValue>
          )
        : undefined,
    },
  };
}
