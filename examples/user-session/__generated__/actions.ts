import assert from 'assert'
import {v4 as uuidv4} from 'uuid'
import {DeleteCommand, GetCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb'
import {ddbDocClient} from "../../../src/client"
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** JavaScript Date stored as a Number in DynamoDB */
  Date: any;
  /** Arbitrary JSON stored as a Map in DynamoDB */
  JSONObject: any;
};

/** The Node interface */
export type Node = {
  id: Scalars['ID'];
};

/** The Query type */
export type Query = {
  __typename?: 'Query';
  node?: Maybe<Node>;
};


/** The Query type */
export type QueryNodeArgs = {
  id: Scalars['ID'];
};

/** SimpleModels are DynamoDB with a key schema that does not include a sort key. */
export type SimpleModel = {
  /** Set automatically when the item is first written */
  createdAt: Scalars['Date'];
  id: Scalars['ID'];
  /** Set automatically when the item is updated */
  updatedAt: Scalars['Date'];
};

/** A user session object. */
export type UserSession = Node & SimpleModel & {
  __typename?: 'UserSession';
  createdAt: Scalars['Date'];
  expires: Scalars['Date'];
  id: Scalars['ID'];
  session: Scalars['JSONObject'];
  updatedAt: Scalars['Date'];
};


export type CreateUserSessionInput = Omit<UserSession, 'createdAt'|'id'|'updatedAt'|'expires'>;

/**  */
export async function createUserSession(input: CreateUserSessionInput): Promise<UserSession> {
  const now = new Date();
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');

  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const data = await ddbDocClient.send(new UpdateCommand({
      ConditionExpression: 'attribute_not_exists(#id)',
      ExpressionAttributeNames: {
        '#createdAt': 'created_at',
        '#id': 'id',
        '#session': 'session',
        '#ttl': 'ttl',
        '#updatedAt': 'updated_at',
      },
      ExpressionAttributeValues: {
        ':createdAt': now.getTime(),
        ':session': input.session,
        ':ttl': now.getTime() + 86400000,
        ':updatedAt': now.getTime(),
      },
      Key: {
        id: `UserSession#${uuidv4()}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: 'SET #createdAt = :createdAt, #session = :session, #ttl = :ttl, #updatedAt = :updatedAt',
  }));
  return {
    createdAt: new Date(data.Attributes?.created_at),
    expires: new Date(data.Attributes?.ttl),
    id: data.Attributes?.id,
    session: data.Attributes?.session,
    updatedAt: new Date(data.Attributes?.updated_at),
  }
}


/**  */
export async function deleteUserSession(id: string) {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');

  const {$metadata, Attributes, ...data} = await ddbDocClient.send(new DeleteCommand({
    ConditionExpression: 'attribute_exists(#id)',
    ExpressionAttributeNames: {
      '#id': 'id',
    },
    Key: {
      id,
    },
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'NONE',
    TableName: tableName,
  }));

  return data;
}



/**  */
export async function readUserSession(id: string) {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');

  const {$metadata, ...data} = await ddbDocClient.send(new GetCommand({
    ConsistentRead: true,
    Key: {
      id,
    },
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  }));

  if (!data.Item) {
    throw new Error(`No UserSession found with id ${id}`);
  }

  return {
    createdAt: new Date(data.Item?.created_at),
    expires: new Date(data.Item?.ttl),
    id: data.Item?.id,
    session: data.Item?.session,
    updatedAt: new Date(data.Item?.updated_at),
  }
}