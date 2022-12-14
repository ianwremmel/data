import type {
  ConsumedCapacity,
  ItemCollectionMetrics,
} from '@aws-sdk/client-dynamodb';
import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import type {
  DeleteCommandInput,
  GetCommandInput,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  QueryCommand,
  QueryCommandInput,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {ServiceException} from '@aws-sdk/smithy-client';
import type {NativeAttributeValue} from '@aws-sdk/util-dynamodb/dist-types/models';
import {
  assert,
  DataIntegrityError,
  NotFoundError,
  OptimisticLockingError,
  UnexpectedAwsError,
  UnexpectedError,
} from '@ianwremmel/data';
import Base64 from 'base64url';

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
export interface QueryOptions {
  limit?: number;
  /**
   * All operators supported by DynamoDB are except `between`. `between` is
   * not supported because it requires two values and that makes the codegen
   * quite a bit more tedious. If it's needed, please open a ticket and we can
   * look into adding it.
   */
  operator?: 'begins_with' | '=' | '<' | '<=' | '>' | '>=';
  reverse?: boolean;
}
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

/** CDC Event Types */
export type CdcEvent = 'INSERT' | 'MODIFY' | 'REMOVE' | 'UPSERT';

/**
 * Models are DynamoDB tables with a key schema that may or may not include a sort
 * key. A Model must be decorated with either @partitionKey or @compositeKey.
 *
 * Note that, while Model does not explicitly implement Node, its `id` field
 * behaves like `Node#id` typically does. This is to avoid defining Node in the
 * injected schema if the consumer's schema also defined Node or defines it
 * differently.
 */
export interface Model {
  createdAt: Scalars['Date'];
  id: Scalars['ID'];
  updatedAt: Scalars['Date'];
  version: Scalars['Int'];
}

/** The Node interface */
export interface Node {
  id: Scalars['ID'];
}

/**
 * Like Model, but includes a `publicId` field which, unline `id`, is semantically
 * meaningless. Types implementing PublicModel will have an additional function,
 * `queryByPublicId`, generated. If any of your models implement PublicModel, then
 * the dependencies module must include an `idGenerator()`.
 */
export interface PublicModel {
  createdAt: Scalars['Date'];
  id: Scalars['ID'];
  publicId: Scalars['String'];
  updatedAt: Scalars['Date'];
  version: Scalars['Int'];
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
    session: Scalars['JSONObject'];
    /**
     * Since `id` is a reserved field, sessionId is the field we'll use to inject a
     * random uuid, which the underlying system will use as the basis for `id`.
     */
    sessionId: Scalars['String'];
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
  sessionId: Scalars['String'];
}

export type CreateUserSessionInput = Omit<
  UserSession,
  'createdAt' | 'expires' | 'id' | 'updatedAt' | 'version'
> &
  Partial<Pick<UserSession, 'expires'>>;
export type CreateUserSessionOutput = ResultType<UserSession>;
/**  */
export async function createUserSession(
  input: Readonly<CreateUserSessionInput>
): Promise<Readonly<CreateUserSessionOutput>> {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallUserSession(input, now);

  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const commandInput: UpdateCommandInput = {
    ConditionExpression: 'attribute_not_exists(#pk)',
    ExpressionAttributeNames: {
      ...ExpressionAttributeNames,
      '#createdAt': '_ct',
    },
    ExpressionAttributeValues: {
      ...ExpressionAttributeValues,
      ':createdAt': now.getTime(),
    },
    Key: {pk: `USER_SESSION#${input.sessionId}`},
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'ALL_NEW',
    TableName: tableName,
    UpdateExpression: `${UpdateExpression}, #createdAt = :createdAt`,
  };

  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(new UpdateCommand(commandInput));

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

export type BlindWriteUserSessionInput = Omit<
  UserSession,
  'createdAt' | 'expires' | 'id' | 'updatedAt' | 'version'
> &
  Partial<Pick<UserSession, 'expires'>>;
export type BlindWriteUserSessionOutput = ResultType<UserSession>;
/** */
export async function blindWriteUserSession(
  input: Readonly<BlindWriteUserSessionInput>
): Promise<Readonly<BlindWriteUserSessionOutput>> {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');
  const now = new Date();
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallUserSession(input, now);

  delete ExpressionAttributeNames['#pk'];
  delete ExpressionAttributeValues[':version'];

  const ean = {
    ...ExpressionAttributeNames,
    '#createdAt': '_ct',
  };
  const eav = {
    ...ExpressionAttributeValues,
    ':one': 1,
    ':createdAt': now.getTime(),
  };
  const ue = `${[
    ...UpdateExpression.split(', ').filter((e) => !e.startsWith('#version')),
    '#createdAt = if_not_exists(#createdAt, :createdAt)',
  ].join(', ')} ADD #version :one`;

  const commandInput: UpdateCommandInput = {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    Key: {pk: `USER_SESSION#${input.sessionId}`},
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'ALL_NEW',
    TableName: tableName,
    UpdateExpression: ue,
  };

  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(new UpdateCommand(commandInput));

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
    const commandInput: DeleteCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      Key: {pk: `USER_SESSION#${input.sessionId}`},
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'NONE',
      TableName: tableName,
    };

    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(new DeleteCommand(commandInput));

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
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type ReadUserSessionOutput = ResultType<UserSession>;

/**  */
export async function readUserSession(
  input: UserSessionPrimaryKey
): Promise<Readonly<ReadUserSessionOutput>> {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: true,
    Key: {pk: `USER_SESSION#${input.sessionId}`},
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  };

  const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
    new GetCommand(commandInput)
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
    const commandInput: UpdateCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#expires': 'ttl',
        '#pk': 'pk',
        '#version': '_v',
      },
      ExpressionAttributeValues: {
        ':ttlInc': 86400000,
        ':versionInc': 1,
      },
      Key: {pk: `USER_SESSION#${input.sessionId}`},
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression:
        'SET #expires = #expires + :ttlInc, #version = #version + :versionInc',
    };

    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(new UpdateCommand(commandInput));

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
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type UpdateUserSessionInput = Omit<
  UserSession,
  'createdAt' | 'expires' | 'id' | 'updatedAt'
> &
  Partial<Pick<UserSession, 'expires'>>;
export type UpdateUserSessionOutput = ResultType<UserSession>;

/**  */
export async function updateUserSession(
  input: Readonly<UpdateUserSessionInput>
): Promise<Readonly<UpdateUserSessionOutput>> {
  const tableName = process.env.TABLE_USER_SESSION;
  assert(tableName, 'TABLE_USER_SESSION is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallUserSession(input);
  try {
    const commandInput: UpdateCommandInput = {
      ConditionExpression:
        '#version = :previousVersion AND #entity = :entity AND attribute_exists(#pk)',
      ExpressionAttributeNames,
      ExpressionAttributeValues: {
        ...ExpressionAttributeValues,
        ':previousVersion': input.version,
      },
      Key: {pk: `USER_SESSION#${input.sessionId}`},
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression,
    };

    const {
      Attributes: item,
      ConsumedCapacity: capacity,
      ItemCollectionMetrics: metrics,
    } = await ddbDocClient.send(new UpdateCommand(commandInput));

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
            sessionId: input.sessionId,
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
        await readUserSession(input);
      } catch {
        throw new NotFoundError('UserSession', {sessionId: input.sessionId});
      }
      throw new OptimisticLockingError('UserSession', {
        sessionId: input.sessionId,
      });
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export interface MarshallUserSessionOutput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type MarshallUserSessionInput = Required<
  Pick<UserSession, 'session' | 'sessionId'>
> &
  Partial<Pick<UserSession, 'expires' | 'version'>>;

/** Marshalls a DynamoDB record into a UserSession object */
export function marshallUserSession(
  input: MarshallUserSessionInput,
  now = new Date()
): MarshallUserSessionOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
    '#session = :session',
    '#sessionId = :sessionId',
    '#updatedAt = :updatedAt',
    '#version = :version',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#session': 'session',
    '#sessionId': 'session_id',
    '#updatedAt': '_md',
    '#version': '_v',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'UserSession',
    ':session': input.session,
    ':sessionId': input.sessionId,
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
  };

  if ('expires' in input && typeof input.expires !== 'undefined') {
    assert(
      !Number.isNaN(input.expires.getTime()),
      'expires was passed but is not a valid date'
    );
    ean['#expires'] = 'ttl';
    eav[':expires'] = input.expires === null ? null : input.expires.getTime();
    updateExpression.push('#expires = :expires');
  } else {
    ean['#expires'] = 'ttl';
    eav[':expires'] = now.getTime() + 86400000;
    updateExpression.push('#expires = :expires');
  }

  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
  };
}

/** Unmarshalls a DynamoDB record into a UserSession object */
export function unmarshallUserSession(item: Record<string, any>): UserSession {
  assert(
    item._ct !== null,
    () => new DataIntegrityError('Expected createdAt to be non-null')
  );
  assert(
    typeof item._ct !== 'undefined',
    () => new DataIntegrityError('Expected createdAt to be defined')
  );

  assert(
    item.ttl !== null,
    () => new DataIntegrityError('Expected expires to be non-null')
  );
  assert(
    typeof item.ttl !== 'undefined',
    () => new DataIntegrityError('Expected expires to be defined')
  );

  assert(
    item.session !== null,
    () => new DataIntegrityError('Expected session to be non-null')
  );
  assert(
    typeof item.session !== 'undefined',
    () => new DataIntegrityError('Expected session to be defined')
  );

  assert(
    item.session_id !== null,
    () => new DataIntegrityError('Expected sessionId to be non-null')
  );
  assert(
    typeof item.session_id !== 'undefined',
    () => new DataIntegrityError('Expected sessionId to be defined')
  );

  assert(
    item._md !== null,
    () => new DataIntegrityError('Expected updatedAt to be non-null')
  );
  assert(
    typeof item._md !== 'undefined',
    () => new DataIntegrityError('Expected updatedAt to be defined')
  );

  assert(
    item._v !== null,
    () => new DataIntegrityError('Expected version to be non-null')
  );
  assert(
    typeof item._v !== 'undefined',
    () => new DataIntegrityError('Expected version to be defined')
  );

  const result: UserSession = {
    createdAt: new Date(item._ct),
    expires: new Date(item.ttl),
    id: Base64.encode(`UserSession:${item.pk}`),
    session: item.session,
    sessionId: item.session_id,
    updatedAt: new Date(item._md),
    version: item._v,
  };

  return result;
}
