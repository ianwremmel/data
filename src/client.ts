// Create service client module using ES6 syntax.
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient} from '@aws-sdk/lib-dynamodb';

// Create an Amazon DynamoDB service client object.
const ddbClient = new DynamoDBClient({
  endpoint: process.env.ENDPOINT,
  region: process.env.REGION,
});

export {ddbClient};

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
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, translateConfig);

export {ddbDocClient};
