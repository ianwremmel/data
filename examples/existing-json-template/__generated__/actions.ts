import type {
  ConsumedCapacity,
  ItemCollectionMetrics,
} from '@aws-sdk/client-dynamodb';
import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type {NativeAttributeValue} from '@aws-sdk/util-dynamodb/dist-types/models';
import {
  assert,
  DataIntegrityError,
  NotFoundError,
  OptimisticLockingError,
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

/** An object to track a user's logins */
export type UserLogin = Model &
  Node &
  Timestamped &
  Versioned & {
    __typename?: 'UserLogin';
    createdAt: Scalars['Date'];
    externalId: Scalars['String'];
    id: Scalars['ID'];
    login: Scalars['String'];
    updatedAt: Scalars['Date'];
    vendor: Vendor;
    version: Scalars['Int'];
  };

/** Indicates which third-party this record came from. */
export type Vendor = 'AZURE_DEV_OPS' | 'GITHUB' | 'GITLAB';

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

export interface UserLoginPrimaryKey {
  externalId: Scalars['String'];
  login: Scalars['String'];
  vendor: Vendor;
}

export type CreateUserLoginInput = Omit<
  UserLogin,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type CreateUserLoginOutput = ResultType<UserLogin>;
/**  */
export async function createUserLogin(
  input: Readonly<CreateUserLoginInput>
): Promise<Readonly<CreateUserLoginOutput>> {
  const tableName = process.env.TABLE_USER_LOGIN;
  assert(tableName, 'TABLE_USER_LOGIN is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallUserLogin(input);
  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
    new UpdateCommand({
      ConditionExpression: 'attribute_not_exists(#pk)',
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      Key: {
        pk: `USER#${input.vendor}#${input.externalId}`,
        sk: `LOGIN#${input.login}`,
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
    item._et === 'UserLogin',
    () =>
      new DataIntegrityError(
        `Expected to write UserLogin but wrote ${item?._et} instead`
      )
  );

  return {
    capacity,
    item: unmarshallUserLogin(item),
    metrics,
  };
}

export type DeleteUserLoginOutput = ResultType<void>;

/**  */
export async function deleteUserLogin(
  input: UserLoginPrimaryKey
): Promise<DeleteUserLoginOutput> {
  const tableName = process.env.TABLE_USER_LOGIN;
  assert(tableName, 'TABLE_USER_LOGIN is not set');

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(
        new DeleteCommand({
          ConditionExpression: 'attribute_exists(#pk)',
          ExpressionAttributeNames: {
            '#pk': 'pk',
          },
          Key: {
            pk: `USER#${input.vendor}#${input.externalId}`,
            sk: `LOGIN#${input.login}`,
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
      throw new NotFoundError('UserLogin', input);
    }
    throw err;
  }
}

export type ReadUserLoginOutput = ResultType<UserLogin>;

/**  */
export async function readUserLogin(
  input: UserLoginPrimaryKey
): Promise<Readonly<ReadUserLoginOutput>> {
  const tableName = process.env.TABLE_USER_LOGIN;
  assert(tableName, 'TABLE_USER_LOGIN is not set');

  const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
    new GetCommand({
      ConsistentRead: false,
      Key: {
        pk: `USER#${input.vendor}#${input.externalId}`,
        sk: `LOGIN#${input.login}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      TableName: tableName,
    })
  );

  assert(
    capacity,
    'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
  );

  assert(item, () => new NotFoundError('UserLogin', input));
  assert(
    item._et === 'UserLogin',
    () =>
      new DataIntegrityError(
        `Expected ${JSON.stringify(input)} to load a UserLogin but loaded ${
          item._et
        } instead`
      )
  );

  return {
    capacity,
    item: unmarshallUserLogin(item),
    metrics: undefined,
  };
}

export type TouchUserLoginOutput = ResultType<void>;

/**  */
export async function touchUserLogin(
  input: UserLoginPrimaryKey
): Promise<TouchUserLoginOutput> {
  const tableName = process.env.TABLE_USER_LOGIN;
  assert(tableName, 'TABLE_USER_LOGIN is not set');
  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(
        new UpdateCommand({
          ConditionExpression: 'attribute_exists(#pk)',
          ExpressionAttributeNames: {
            '#pk': 'pk',
            '#version': '_v',
          },
          ExpressionAttributeValues: {
            ':versionInc': 1,
          },
          Key: {
            pk: `USER#${input.vendor}#${input.externalId}`,
            sk: `LOGIN#${input.login}`,
          },
          ReturnConsumedCapacity: 'INDEXES',
          ReturnItemCollectionMetrics: 'SIZE',
          ReturnValues: 'ALL_NEW',
          TableName: tableName,
          UpdateExpression: 'SET #version = #version + :versionInc',
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
      throw new NotFoundError('UserLogin', input);
    }
    throw err;
  }
}

export type UpdateUserLoginInput = Omit<
  UserLogin,
  'createdAt' | 'id' | 'updatedAt'
>;
export type UpdateUserLoginOutput = ResultType<UserLogin>;

/**  */
export async function updateUserLogin(
  input: Readonly<UpdateUserLoginInput>
): Promise<Readonly<UpdateUserLoginOutput>> {
  const tableName = process.env.TABLE_USER_LOGIN;
  assert(tableName, 'TABLE_USER_LOGIN is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallUserLogin(input);
  try {
    const {
      Attributes: item,
      ConsumedCapacity: capacity,
      ItemCollectionMetrics: metrics,
    } = await ddbDocClient.send(
      new UpdateCommand({
        ConditionExpression:
          '#version = :previousVersion AND #entity = :entity AND attribute_exists(#pk)',
        ExpressionAttributeNames,
        ExpressionAttributeValues: {
          ...ExpressionAttributeValues,
          ':previousVersion': input.version,
        },
        Key: {
          pk: `USER#${input.vendor}#${input.externalId}`,
          sk: `LOGIN#${input.login}`,
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
      item._et === 'UserLogin',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify({
            externalId: input.externalId,
            login: input.login,
            vendor: input.vendor,
          })} to update a UserLogin but updated ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallUserLogin(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        await readUserLogin(input);
      } catch {
        throw new NotFoundError('UserLogin', {
          externalId: input.externalId,
          login: input.login,
          vendor: input.vendor,
        });
      }
      throw new OptimisticLockingError('UserLogin', {
        externalId: input.externalId,
        login: input.login,
        vendor: input.vendor,
      });
    }
    throw err;
  }
}

export type QueryUserLoginInput =
  | {
      externalId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      externalId: Scalars['String'];
      login: Scalars['String'];
      vendor: Vendor;
    }
  | {index: 'gsi1'; login: Scalars['String']; vendor: Vendor}
  | {
      index: 'gsi1';
      login: Scalars['String'];
      updatedAt: Scalars['Date'];
      vendor: Vendor;
    };
export type QueryUserLoginOutput = MultiResultType<UserLogin>;

/** helper */
function makePartitionKeyForQueryUserLogin(input: QueryUserLoginInput): string {
  if (!('index' in input)) {
    return `USER#${input.vendor}#${input.externalId}`;
  } else if ('index' in input && input.index === 'gsi1') {
    return `LOGIN#${input.vendor}#${input.login}`;
  }

  throw new Error('Could not construct partition key from input');
}

/** helper */
function makeSortKeyForQueryUserLogin(
  input: QueryUserLoginInput
): string | undefined {
  if ('index' in input && input.index === 'gsi1') {
    return ['MODIFIED', 'updatedAt' in input && input.updatedAt]
      .filter(Boolean)
      .join('#');
  }

  assert(!('index' in input), 'Invalid index name');

  return ['LOGIN', 'login' in input && input.login].filter(Boolean).join('#');
}

/** queryUserLogin */
export async function queryUserLogin(
  input: Readonly<QueryUserLoginInput>
): Promise<Readonly<QueryUserLoginOutput>> {
  const tableName = process.env.TABLE_USER_LOGIN;
  assert(tableName, 'TABLE_USER_LOGIN is not set');

  const {ConsumedCapacity: capacity, Items: items = []} =
    await ddbDocClient.send(
      new QueryCommand({
        ConsistentRead: false,
        ExpressionAttributeNames: {
          '#pk': `${'index' in input ? input.index : ''}pk`,
          '#sk': `${'index' in input ? input.index : ''}sk`,
        },
        ExpressionAttributeValues: {
          ':pk': makePartitionKeyForQueryUserLogin(input),
          ':sk': makeSortKeyForQueryUserLogin(input),
        },
        IndexName: 'index' in input ? input.index : undefined,
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
        ReturnConsumedCapacity: 'INDEXES',
        TableName: tableName,
      })
    );

  assert(
    capacity,
    'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
  );

  return {
    capacity,
    items: items.map((item) => {
      assert(item._et === 'UserLogin', () => new DataIntegrityError('TODO'));
      return unmarshallUserLogin(item);
    }),
  };
}

/** queries the UserLogin table by primary key using a node id */
export async function queryUserLoginByNodeId(
  id: Scalars['ID']
): Promise<Readonly<Omit<ResultType<UserLogin>, 'metrics'>>> {
  const primaryKeyValues = Base64.decode(id)
    .split(':')
    .slice(1)
    .join(':')
    .split('#');

  const primaryKey: QueryUserLoginInput = {
    vendor: primaryKeyValues[1] as Vendor,
    externalId: primaryKeyValues[2],
  };

  if (typeof primaryKeyValues[2] !== 'undefined') {
    // @ts-ignore - TSC will usually see this as an error because it determined
    // that primaryKey is the no-sort-fields-specified version of the type.
    primaryKey.login = primaryKeyValues[5];
  }

  const {capacity, items} = await queryUserLogin(primaryKey);

  assert(items.length > 0, () => new NotFoundError('UserLogin', primaryKey));
  assert(
    items.length < 2,
    () => new DataIntegrityError(`Found multiple UserLogin with id ${id}`)
  );

  return {capacity, item: items[0]};
}

export interface MarshallUserLoginOutput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

/** Marshalls a DynamoDB record into a UserLogin object */
export function marshallUserLogin(
  input: Record<string, any>
): MarshallUserLoginOutput {
  const now = new Date();

  const updateExpression: string[] = [
    '#entity = :entity',
    '#createdAt = :createdAt',
    '#externalId = :externalId',
    '#login = :login',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
    '#gsi1pk = :gsi1pk',
    '#gsi1sk = :gsi1sk',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#createdAt': '_ct',
    '#externalId': 'external_id',
    '#login': 'login',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
    '#pk': 'pk',
    '#gsi1pk': 'gsi1pk',
    '#gsi1sk': 'gsi1sk',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'UserLogin',
    ':createdAt': now.getTime(),
    ':externalId': input.externalId,
    ':login': input.login,
    ':updatedAt': now.getTime(),
    ':vendor': input.vendor,
    ':version': ('version' in input ? input.version : 0) + 1,
    ':gsi1pk': `LOGIN#${input.vendor}#${input.login}`,
    ':gsi1sk': `MODIFIED#${now.getTime()}`,
  };

  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
  };
}

/** Unmarshalls a DynamoDB record into a UserLogin object */
export function unmarshallUserLogin(item: Record<string, any>): UserLogin {
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
  if ('external_id' in item) {
    assert(
      item.external_id !== null,
      () => new DataIntegrityError('Expected externalId to be non-null')
    );
    assert(
      typeof item.external_id !== 'undefined',
      () => new DataIntegrityError('Expected externalId to be defined')
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
  if ('login' in item) {
    assert(
      item.login !== null,
      () => new DataIntegrityError('Expected login to be non-null')
    );
    assert(
      typeof item.login !== 'undefined',
      () => new DataIntegrityError('Expected login to be defined')
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
  if ('vendor' in item) {
    assert(
      item.vendor !== null,
      () => new DataIntegrityError('Expected vendor to be non-null')
    );
    assert(
      typeof item.vendor !== 'undefined',
      () => new DataIntegrityError('Expected vendor to be defined')
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

  const result: UserLogin = {
    createdAt: new Date(item._ct),
    externalId: item.external_id,
    id: Base64.encode(`UserLogin:${item.pk}#:#${item.sk}`),
    login: item.login,
    updatedAt: new Date(item._md),
    vendor: item.vendor,
    version: item._v,
  };

  return result;
}
