import {
  ConditionalCheckFailedException,
  ConsumedCapacity,
  ItemCollectionMetrics,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {v4 as uuidv4} from 'uuid';

import {
  assert,
  DataIntegrityError,
  NotFoundError,
  OptimisticLockingError,
} from '../../..';
import {ddbDocClient} from '../../dependencies';
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

/** Models are DynamoDB with a key schema that does not include a sort key. */
export interface Model {
  createdAt: Scalars['Date'];
  updatedAt: Scalars['Date'];
  version: Scalars['Int'];
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
export type UserSession = Model &
  Node &
  Timestamped &
  Versioned & {
    __typename?: 'UserSession';
    createdAt: Scalars['Date'];
    expires: Scalars['Date'];
    id: Scalars['ID'];
    /**
     * This field has nothing to do with UserSession, but this was the easiest place
     * to add it for testing. The intent is to prove that we can write an object,
     * when an optional field is absent from the payload.
     */
    optionalField?: Maybe<Scalars['String']>;
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

export interface MultiResultType<T> {
  capacity: ConsumedCapacity;
  items: T[];
}

export interface UserSessionPrimaryKey {
  id: Scalars['ID'];
}

export type CreateUserSessionInput = Omit<
  UserSession,
  'createdAt' | 'expires' | 'id' | 'updatedAt' | 'version'
>;
export type CreateUserSessionOutput = ResultType<UserSession>;
/**  */
export async function createUserSession(
  input: Readonly<CreateUserSessionInput>
): Promise<Readonly<CreateUserSessionOutput>> {
  const now = new Date();
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');
  const {UpdateExpression} = marshallUserSession(input);
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
        '#expires': 'ttl',
        '#id': 'id',
        '#session': 'session',
        '#updatedAt': '_md',
        '#version': '_v',
        ...('optionalField' in input
          ? {'#optionalField': 'optional_field'}
          : undefined),
      },
      ExpressionAttributeValues: {
        ':createdAt': now.getTime(),
        ':entity': 'UserSession',
        ':expires': now.getTime() + 86400000,
        ':session': input.session,
        ':updatedAt': now.getTime(),
        ':version': 1,
        ...('optionalField' in input
          ? {':optionalField': input.optionalField}
          : undefined),
      },
      Key: {
        id: `UserSession#${uuidv4()}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression,
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
    item: unmarshallUserSession(item),
    metrics,
  };
}

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
    item: unmarshallUserSession(item),
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
            '#expires': 'ttl',
            '#id': 'id',
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
            'SET #expires = #expires + :ttlInc, #version = #version + :versionInc',
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
  'createdAt' | 'expires' | 'updatedAt'
>;
export type UpdateUserSessionOutput = ResultType<UserSession>;

/**  */
export async function updateUserSession(
  input: Readonly<UpdateUserSessionInput>
): Promise<Readonly<UpdateUserSessionOutput>> {
  const now = new Date();
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');
  const {UpdateExpression} = marshallUserSession(input);
  try {
    const {
      Attributes: item,
      ConsumedCapacity: capacity,
      ItemCollectionMetrics: metrics,
    } = await ddbDocClient.send(
      new UpdateCommand({
        ConditionExpression:
          '#version = :previousVersion AND #entity = :entity AND attribute_exists(#id)',
        ExpressionAttributeNames: {
          '#createdAt': '_ct',
          '#entity': '_et',
          '#expires': 'ttl',
          '#id': 'id',
          '#session': 'session',
          '#updatedAt': '_md',
          '#version': '_v',
          ...('optionalField' in input
            ? {'#optionalField': 'optional_field'}
            : undefined),
        },
        ExpressionAttributeValues: {
          ':createdAt': now.getTime(),
          ':entity': 'UserSession',
          ':expires': now.getTime() + 86400000,
          ':previousVersion': input.version,
          ':session': input.session,
          ':updatedAt': now.getTime(),
          ':version': input.version + 1,
          ...('optionalField' in input
            ? {':optionalField': input.optionalField}
            : undefined),
        },
        Key: {
          id: input.id,
        },
        ReturnConsumedCapacity: 'INDEXES',
        ReturnItemCollectionMetrics: 'SIZE',
        ReturnValues: 'ALL_NEW',
        TableName: tableName,
        UpdateExpression,
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
          `Expected ${JSON.stringify({
            id: input.id,
          })} to update a UserSession but updated ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallUserSession(item),
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

export interface MarshallUserSessionOutput {
  UpdateExpression: string;
}

/** Marshalls a DynamoDB record into a UserSession object */
export function marshallUserSession(
  input: Record<string, any>
): MarshallUserSessionOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
    '#createdAt = :createdAt',
    '#expires = :expires',
    '#session = :session',
    '#updatedAt = :updatedAt',
    '#version = :version',
  ];

  if ('optionalField' in input) {
    updateExpression.push('#optionalField = :optionalField');
  }

  updateExpression.sort();

  return {UpdateExpression: `SET ${updateExpression.join(', ')}`};
}

/** Unmarshalls a DynamoDB record into a UserSession object */
export function unmarshallUserSession(item: Record<string, any>): UserSession {
  if ('_ct' in item) {
    assert(
      item._ct !== null,
      () => new DataIntegrityError('Expected createdAt to be non-null')
    );
    assert(
      typeof item._ct !== 'undefined',
      () => new DataIntegrityError('Expected createdAt to be defined')
    );
  }
  if ('ttl' in item) {
    assert(
      item.ttl !== null,
      () => new DataIntegrityError('Expected expires to be non-null')
    );
    assert(
      typeof item.ttl !== 'undefined',
      () => new DataIntegrityError('Expected expires to be defined')
    );
  }
  if ('id' in item) {
    assert(
      item.id !== null,
      () => new DataIntegrityError('Expected id to be non-null')
    );
    assert(
      typeof item.id !== 'undefined',
      () => new DataIntegrityError('Expected id to be defined')
    );
  }
  if ('session' in item) {
    assert(
      item.session !== null,
      () => new DataIntegrityError('Expected session to be non-null')
    );
    assert(
      typeof item.session !== 'undefined',
      () => new DataIntegrityError('Expected session to be defined')
    );
  }
  if ('_md' in item) {
    assert(
      item._md !== null,
      () => new DataIntegrityError('Expected updatedAt to be non-null')
    );
    assert(
      typeof item._md !== 'undefined',
      () => new DataIntegrityError('Expected updatedAt to be defined')
    );
  }
  if ('_v' in item) {
    assert(
      item._v !== null,
      () => new DataIntegrityError('Expected version to be non-null')
    );
    assert(
      typeof item._v !== 'undefined',
      () => new DataIntegrityError('Expected version to be defined')
    );
  }

  let result: UserSession = {
    createdAt: new Date(item._ct),
    expires: new Date(item.ttl),
    id: item.id,
    session: item.session,
    updatedAt: new Date(item._md),
    version: item._v,
  };

  if ('optional_field' in item) {
    result = {
      ...result,
      optionalField: item.optional_field,
    };
  }

  return result;
}
