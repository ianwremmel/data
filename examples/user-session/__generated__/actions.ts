import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {DeleteCommand, GetCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb';
import {
  assert,
  DataIntegrityError,
  NotFoundError,
  OptimisticLockingError,
} from '@ianwremmel/data';
import {v4 as uuidv4} from 'uuid';

import {ddbDocClient} from '../../../src/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends {[key: string]: unknown}> = {[K in keyof T]: T[K]};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** JavaScript Date stored as a Number in DynamoDB */
  Date: Date;
  /** Arbitrary JSON stored as a Map in DynamoDB */
  JSONObject: Record<string, unknown>;
}

/** The Node interface */
export interface Node {
  id: Scalars['ID'];
}

/** The Query type */
export interface Query {
  __typename?: 'Query';
  node?: Maybe<Node>;
}

/** The Query type */
export interface QueryNodeArgs {
  id: Scalars['ID'];
}

/** SimpleModels are DynamoDB with a key schema that does not include a sort key. */
export interface SimpleModel {
  /** Set automatically when the item is first written */
  createdAt: Scalars['Date'];
  id: Scalars['ID'];
  /** Set automatically when the item is updated */
  updatedAt: Scalars['Date'];
  version: Scalars['Int'];
}

/** A user session object. */
export type UserSession = Node &
  SimpleModel & {
    __typename?: 'UserSession';
    createdAt: Scalars['Date'];
    expires: Scalars['Date'];
    id: Scalars['ID'];
    session: Scalars['JSONObject'];
    updatedAt: Scalars['Date'];
    version: Scalars['Int'];
  };

export type CreateUserSessionInput = Omit<
  UserSession,
  'createdAt' | 'id' | 'updatedAt' | 'expires' | 'version'
>;

/**  */
export async function createUserSession(
  input: Readonly<CreateUserSessionInput>
): Promise<Readonly<UserSession>> {
  const now = new Date();
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');

  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const data = await ddbDocClient.send(
    new UpdateCommand({
      ConditionExpression: 'attribute_not_exists(#id)',
      ExpressionAttributeNames: {
        '#createdAt': '_ct',
        '#entity': '_et',
        '#id': 'id',
        '#session': 'session',
        '#ttl': 'ttl',
        '#updatedAt': '_md',
        '#version': '_v',
      },
      ExpressionAttributeValues: {
        ':createdAt': now.getTime(),
        ':entity': 'UserSession',
        ':session': input.session,
        ':ttl': now.getTime() + 86400000,
        ':updatedAt': now.getTime(),
        ':version': 1,
      },
      Key: {
        id: `UserSession#${uuidv4()}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression:
        'SET #createdAt = :createdAt, #entity = :entity, #session = :session, #ttl = :ttl, #updatedAt = :updatedAt, #version = :version',
    })
  );

  assert(
    data.Attributes?._et === 'UserSession',
    () =>
      new DataIntegrityError(
        `Expected write UserSession but wrote ${data.Attributes._et} instead`
      )
  );

  return {
    createdAt: new Date(data.Attributes?._ct),
    expires: new Date(data.Attributes?.ttl),
    id: data.Attributes?.id,
    session: data.Attributes?.session,
    updatedAt: new Date(data.Attributes?._md),
    version: data.Attributes?._v,
  };
}

/**  */
export async function deleteUserSession(id: string) {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');

  try {
    const {$metadata, Attributes, ...data} = await ddbDocClient.send(
      new DeleteCommand({
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
      })
    );

    return data;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new NotFoundError('UserSession', id);
    }
    throw err;
  }
}

/**  */
export async function readUserSession(
  id: string
): Promise<Readonly<UserSession>> {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');

  const {$metadata, ...data} = await ddbDocClient.send(
    new GetCommand({
      ConsistentRead: true,
      Key: {
        id,
      },
      ReturnConsumedCapacity: 'INDEXES',
      TableName: tableName,
    })
  );

  assert(data.Item, () => new NotFoundError('UserSession', id));
  assert(
    data.Item?._et === 'UserSession',
    () =>
      new DataIntegrityError(
        `Expected ${id} to load a UserSession but loaded ${data.Item._et} instead`
      )
  );

  return {
    createdAt: new Date(data.Item?._ct),
    expires: new Date(data.Item?.ttl),
    id: data.Item?.id,
    session: data.Item?.session,
    updatedAt: new Date(data.Item?._md),
    version: data.Item?._v,
  };
}

/**  */
export async function touchUserSession(id: Scalars['ID']): Promise<void> {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');
  try {
    await ddbDocClient.send(
      new UpdateCommand({
        ConditionExpression: 'attribute_exists(#id)',
        ExpressionAttributeNames: {
          '#id': 'id',
          '#ttl': 'ttl',
          '#version': '_v',
        },
        ExpressionAttributeValues: {
          ':ttlInc': 86400000,
          ':versionInc': 1,
        },
        Key: {
          id,
        },
        ReturnConsumedCapacity: 'INDEXES',
        ReturnValues: 'ALL_NEW',
        TableName: tableName,
        UpdateExpression:
          'SET #ttl = #ttl + :ttlInc, #version = #version + :versionInc',
      })
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new NotFoundError('UserSession', id);
    }
    throw err;
  }
}

export type UpdateUserSessionInput = Omit<
  UserSession,
  'createdAt' | 'updatedAt' | 'expires'
>;

/**  */
export async function updateUserSession(
  input: Readonly<UpdateUserSessionInput>
): Promise<Readonly<UserSession>> {
  const now = new Date();
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');
  try {
    const data = await ddbDocClient.send(
      new UpdateCommand({
        ConditionExpression: '#version = :version AND attribute_exists(#id)',
        ExpressionAttributeNames: {
          '#createdAt': '_ct',
          '#id': 'id',
          '#session': 'session',
          '#ttl': 'ttl',
          '#updatedAt': '_md',
          '#version': '_v',
        },
        ExpressionAttributeValues: {
          ':createdAt': now.getTime(),
          ':newVersion': input.version + 1,
          ':session': input.session,
          ':ttl': now.getTime() + 86400000,
          ':updatedAt': now.getTime(),
          ':version': input.version,
        },
        Key: {
          id: input.id,
        },
        ReturnConsumedCapacity: 'INDEXES',
        ReturnValues: 'ALL_NEW',
        TableName: tableName,
        UpdateExpression:
          'SET #createdAt = :createdAt, #session = :session, #ttl = :ttl, #updatedAt = :updatedAt, #version = :newVersion',
      })
    );
    assert(
      data.Attributes?._et === 'UserSession',
      () =>
        new DataIntegrityError(
          `Expected ${id} to load a UserSession but loaded ${data.Attributes._et} instead`
        )
    );

    return {
      createdAt: new Date(data.Attributes?._ct),
      expires: new Date(data.Attributes?.ttl),
      id: data.Attributes?.id,
      session: data.Attributes?.session,
      updatedAt: new Date(data.Attributes?._md),
      version: data.Attributes?._v,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        const readResult = await readUserSession(input.id);
      } catch {
        throw new NotFoundError('UserSession', input.id);
      }
      throw new OptimisticLockingError('UserSession', input.id);
    }
    throw err;
  }
}
