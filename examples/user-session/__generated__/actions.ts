import {
  ConditionalCheckFailedException,
  ConsumedCapacity,
  ItemCollectionMetrics,
} from '@aws-sdk/client-dynamodb';
import {DeleteCommand, GetCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb';
import {v4 as uuidv4} from 'uuid';

import {
  assert,
  DataIntegrityError,
  NotFoundError,
  OptimisticLockingError,
} from '../../..';
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
  createdAt: Scalars['Date'];
  id: Scalars['ID'];
  updatedAt: Scalars['Date'];
  version: Scalars['Int'];
}

/**
 * Automatically adds a createdAt and updatedAt timestamp to the entity and sets
 * them appropriately. The createdAt timestamp is only set on create, while the
 * updatedAt timestamp is set on create and update.
 */
export interface Timestamped {
  /** Set automatically when the item is first written */
  createdAt: Scalars['Date'];
  /** Set automatically when the item is updated */
  updatedAt: Scalars['Date'];
}

/** A user session object. */
export type UserSession = Node &
  SimpleModel &
  Timestamped &
  Versioned & {
    __typename?: 'UserSession';
    createdAt: Scalars['Date'];
    expires: Scalars['Date'];
    id: Scalars['ID'];
    session: Scalars['JSONObject'];
    updatedAt: Scalars['Date'];
    version: Scalars['Int'];
  };

/**
 * Automatically adds a column to enable optimistic locking. This field shouldn't
 * be manipulated directly, but may need to be passed around by the runtime in
 * order to make updates.
 */
export interface Versioned {
  version: Scalars['Int'];
}

export interface ResultType<T> {
  capacity: ConsumedCapacity;
  item: T;
  metrics: ItemCollectionMetrics | undefined;
}

export interface UserSessionPrimaryKey {
  id: Scalars['ID'];
}

export type CreateUserSessionInput = Omit<
  UserSession,
  'createdAt' | 'id' | 'updatedAt' | 'expires' | 'version'
>;
export type CreateUserSessionOutput = ResultType<UserSession>;
/**  */
export async function createUserSession(
  input: Readonly<CreateUserSessionInput>
): Promise<Readonly<CreateUserSessionOutput>> {
  const now = new Date();
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');

  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
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
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression:
        'SET #createdAt = :createdAt, #entity = :entity, #session = :session, #ttl = :ttl, #updatedAt = :updatedAt, #version = :version',
    })
  );

  assert(
    capacity,
    'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
  );

  assert(item, 'Expected DynamoDB ot return an Attributes prop.');
  assert(
    item._et === 'UserSession',
    () =>
      new DataIntegrityError(
        `Expected to write UserSession but wrote ${item?._et} instead`
      )
  );

  return {
    capacity,
    item: {
      createdAt: (() => {
        assert(
          item._ct !== null,
          () => new DataIntegrityError('Expected createdAt to be non-null')
        );
        assert(
          typeof item._ct !== 'undefined',
          () => new DataIntegrityError('Expected createdAt to be defined')
        );
        return new Date(item._ct);
      })(),
      expires: (() => {
        assert(
          item.ttl !== null,
          () => new DataIntegrityError('Expected expires to be non-null')
        );
        assert(
          typeof item.ttl !== 'undefined',
          () => new DataIntegrityError('Expected expires to be defined')
        );
        return new Date(item.ttl);
      })(),
      id: (() => {
        assert(
          item.id !== null,
          () => new DataIntegrityError('Expected id to be non-null')
        );
        assert(
          typeof item.id !== 'undefined',
          () => new DataIntegrityError('Expected id to be defined')
        );
        return item.id;
      })(),
      session: (() => {
        assert(
          item.session !== null,
          () => new DataIntegrityError('Expected session to be non-null')
        );
        assert(
          typeof item.session !== 'undefined',
          () => new DataIntegrityError('Expected session to be defined')
        );
        return item.session;
      })(),
      updatedAt: (() => {
        assert(
          item._md !== null,
          () => new DataIntegrityError('Expected updatedAt to be non-null')
        );
        assert(
          typeof item._md !== 'undefined',
          () => new DataIntegrityError('Expected updatedAt to be defined')
        );
        return new Date(item._md);
      })(),
      version: (() => {
        assert(
          item._v !== null,
          () => new DataIntegrityError('Expected version to be non-null')
        );
        assert(
          typeof item._v !== 'undefined',
          () => new DataIntegrityError('Expected version to be defined')
        );
        return item._v;
      })(),
    },
    metrics,
  };
}

export type DeleteUserSessionInput = Scalars['ID'];
export type DeleteUserSessionOutput = ResultType<void>;

/**  */
export async function deleteUserSession(
  input: UserSessionPrimaryKey
): Promise<DeleteUserSessionOutput> {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(
        new DeleteCommand({
          ConditionExpression: 'attribute_exists(#id)',
          ExpressionAttributeNames: {
            '#id': 'id',
          },
          Key: {
            id: input.id,
          },
          ReturnConsumedCapacity: 'INDEXES',
          ReturnItemCollectionMetrics: 'SIZE',
          ReturnValues: 'NONE',
          TableName: tableName,
        })
      );

    assert(
      capacity,
      'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
    );

    return {
      capacity,
      item: undefined,
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new NotFoundError('UserSession', input);
    }
    throw err;
  }
}

export type ReadUserSessionInput = Scalars['ID'];
export type ReadUserSessionOutput = ResultType<UserSession>;

/**  */
export async function readUserSession(
  input: UserSessionPrimaryKey
): Promise<Readonly<ReadUserSessionOutput>> {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');

  const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
    new GetCommand({
      ConsistentRead: true,
      Key: {
        id: input.id,
      },
      ReturnConsumedCapacity: 'INDEXES',
      TableName: tableName,
    })
  );

  assert(
    capacity,
    'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
  );

  assert(item, () => new NotFoundError('UserSession', input));
  assert(
    item._et === 'UserSession',
    () =>
      new DataIntegrityError(
        `Expected ${JSON.stringify(input)} to load a UserSession but loaded ${
          item._et
        } instead`
      )
  );

  return {
    capacity,
    item: {
      createdAt: (() => {
        assert(
          item._ct !== null,
          () => new DataIntegrityError('Expected createdAt to be non-null')
        );
        assert(
          typeof item._ct !== 'undefined',
          () => new DataIntegrityError('Expected createdAt to be defined')
        );
        return new Date(item._ct);
      })(),
      expires: (() => {
        assert(
          item.ttl !== null,
          () => new DataIntegrityError('Expected expires to be non-null')
        );
        assert(
          typeof item.ttl !== 'undefined',
          () => new DataIntegrityError('Expected expires to be defined')
        );
        return new Date(item.ttl);
      })(),
      id: (() => {
        assert(
          item.id !== null,
          () => new DataIntegrityError('Expected id to be non-null')
        );
        assert(
          typeof item.id !== 'undefined',
          () => new DataIntegrityError('Expected id to be defined')
        );
        return item.id;
      })(),
      session: (() => {
        assert(
          item.session !== null,
          () => new DataIntegrityError('Expected session to be non-null')
        );
        assert(
          typeof item.session !== 'undefined',
          () => new DataIntegrityError('Expected session to be defined')
        );
        return item.session;
      })(),
      updatedAt: (() => {
        assert(
          item._md !== null,
          () => new DataIntegrityError('Expected updatedAt to be non-null')
        );
        assert(
          typeof item._md !== 'undefined',
          () => new DataIntegrityError('Expected updatedAt to be defined')
        );
        return new Date(item._md);
      })(),
      version: (() => {
        assert(
          item._v !== null,
          () => new DataIntegrityError('Expected version to be non-null')
        );
        assert(
          typeof item._v !== 'undefined',
          () => new DataIntegrityError('Expected version to be defined')
        );
        return item._v;
      })(),
    },
    metrics: undefined,
  };
}

export type TouchUserSessionOutput = ResultType<void>;

/**  */
export async function touchUserSession(
  input: UserSessionPrimaryKey
): Promise<TouchUserSessionOutput> {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');
  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
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
            id: input.id,
          },
          ReturnConsumedCapacity: 'INDEXES',
          ReturnItemCollectionMetrics: 'SIZE',
          ReturnValues: 'ALL_NEW',
          TableName: tableName,
          UpdateExpression:
            'SET #ttl = #ttl + :ttlInc, #version = #version + :versionInc',
        })
      );

    assert(
      capacity,
      'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
    );

    return {
      capacity,
      item: undefined,
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new NotFoundError('UserSession', input);
    }
    throw err;
  }
}

export type UpdateUserSessionInput = Omit<
  UserSession,
  'createdAt' | 'updatedAt' | 'expires'
>;
export type UpdateUserSessionOutput = ResultType<UserSession>;

/**  */
export async function updateUserSession(
  input: Readonly<UpdateUserSessionInput>
): Promise<Readonly<UpdateUserSessionOutput>> {
  const now = new Date();
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');
  try {
    const {
      Attributes: item,
      ConsumedCapacity: capacity,
      ItemCollectionMetrics: metrics,
    } = await ddbDocClient.send(
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
        ReturnItemCollectionMetrics: 'SIZE',
        ReturnValues: 'ALL_NEW',
        TableName: tableName,
        UpdateExpression:
          'SET #createdAt = :createdAt, #session = :session, #ttl = :ttl, #updatedAt = :updatedAt, #version = :newVersion',
      })
    );

    assert(
      capacity,
      'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
    );

    assert(item, 'Expected DynamoDB ot return an Attributes prop.');
    assert(
      item._et === 'UserSession',
      () =>
        new DataIntegrityError(
          `Expected ${input.id} to update a UserSession but updated ${item._et} instead`
        )
    );

    return {
      capacity,
      item: {
        createdAt: (() => {
          assert(
            item._ct !== null,
            () => new DataIntegrityError('Expected createdAt to be non-null')
          );
          assert(
            typeof item._ct !== 'undefined',
            () => new DataIntegrityError('Expected createdAt to be defined')
          );
          return new Date(item._ct);
        })(),
        expires: (() => {
          assert(
            item.ttl !== null,
            () => new DataIntegrityError('Expected expires to be non-null')
          );
          assert(
            typeof item.ttl !== 'undefined',
            () => new DataIntegrityError('Expected expires to be defined')
          );
          return new Date(item.ttl);
        })(),
        id: (() => {
          assert(
            item.id !== null,
            () => new DataIntegrityError('Expected id to be non-null')
          );
          assert(
            typeof item.id !== 'undefined',
            () => new DataIntegrityError('Expected id to be defined')
          );
          return item.id;
        })(),
        session: (() => {
          assert(
            item.session !== null,
            () => new DataIntegrityError('Expected session to be non-null')
          );
          assert(
            typeof item.session !== 'undefined',
            () => new DataIntegrityError('Expected session to be defined')
          );
          return item.session;
        })(),
        updatedAt: (() => {
          assert(
            item._md !== null,
            () => new DataIntegrityError('Expected updatedAt to be non-null')
          );
          assert(
            typeof item._md !== 'undefined',
            () => new DataIntegrityError('Expected updatedAt to be defined')
          );
          return new Date(item._md);
        })(),
        version: (() => {
          assert(
            item._v !== null,
            () => new DataIntegrityError('Expected version to be non-null')
          );
          assert(
            typeof item._v !== 'undefined',
            () => new DataIntegrityError('Expected version to be defined')
          );
          return item._v;
        })(),
      },
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        const readResult = await readUserSession(input);
      } catch {
        throw new NotFoundError('UserSession', {
          id: input.id,
        });
      }
      throw new OptimisticLockingError('UserSession', {
        id: input.id,
      });
    }
    throw err;
  }
}
