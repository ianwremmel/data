import {
  ConditionalCheckFailedException,
  ConsumedCapacity,
  ItemCollectionMetrics,
} from '@aws-sdk/client-dynamodb';
import type {
  DeleteCommandInput,
  GetCommandInput,
  QueryCommandInput,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {ServiceException} from '@aws-sdk/smithy-client';
import type {NativeAttributeValue} from '@aws-sdk/util-dynamodb';
import type {MultiResultType, ResultType, QueryOptions} from '@ianwremmel/data';
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
 * Like Model, but includes a `publicId` field which, unlike `id`, is semantically
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

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallUserLogin(input, now);

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
    Key: {
      pk: `USER#${input.vendor}#${input.externalId}`,
      sk: `LOGIN#${input.login}`,
    },
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

export type BlindWriteUserLoginInput = Omit<
  UserLogin,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type BlindWriteUserLoginOutput = ResultType<UserLogin>;
/** */
export async function blindWriteUserLogin(
  input: Readonly<BlindWriteUserLoginInput>
): Promise<Readonly<BlindWriteUserLoginOutput>> {
  const tableName = process.env.TABLE_USER_LOGIN;
  assert(tableName, 'TABLE_USER_LOGIN is not set');
  const now = new Date();
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallUserLogin(input, now);

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
    Key: {
      pk: `USER#${input.vendor}#${input.externalId}`,
      sk: `LOGIN#${input.login}`,
    },
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
    const commandInput: DeleteCommandInput = {
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
      throw new NotFoundError('UserLogin', input);
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type ReadUserLoginOutput = ResultType<UserLogin>;

/**  */
export async function readUserLogin(
  input: UserLoginPrimaryKey
): Promise<Readonly<ReadUserLoginOutput>> {
  const tableName = process.env.TABLE_USER_LOGIN;
  assert(tableName, 'TABLE_USER_LOGIN is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: false,
    Key: {
      pk: `USER#${input.vendor}#${input.externalId}`,
      sk: `LOGIN#${input.login}`,
    },
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
    const commandInput: UpdateCommandInput = {
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
      throw new NotFoundError('UserLogin', input);
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
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
    const commandInput: UpdateCommandInput = {
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
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type QueryUserLoginInput =
  | {externalId: Scalars['String']; vendor: Vendor}
  | {externalId: Scalars['String']; login: Scalars['String']; vendor: Vendor}
  | {index: 'gsi1'; login: Scalars['String']; vendor: Vendor}
  | {
      index: 'gsi1';
      login: Scalars['String'];
      updatedAt: Scalars['Date'];
      vendor: Vendor;
    };
export type QueryUserLoginOutput = MultiResultType<UserLogin>;

/** helper */
function makeEanForQueryUserLogin(
  input: QueryUserLoginInput
): Record<string, string> {
  if ('index' in input) {
    if (input.index === 'gsi1') {
      return {'#pk': 'gsi1pk', '#sk': 'gsi1sk'};
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {'#pk': 'pk', '#sk': 'sk'};
  }
}

/** helper */
function makeEavForQueryUserLogin(
  input: QueryUserLoginInput
): Record<string, any> {
  if ('index' in input) {
    if (input.index === 'gsi1') {
      return {
        ':pk': `LOGIN#${input.vendor}#${input.login}`,
        ':sk': ['MODIFIED', 'updatedAt' in input && input.updatedAt]
          .filter(Boolean)
          .join('#'),
      };
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {
      ':pk': `USER#${input.vendor}#${input.externalId}`,
      ':sk': ['LOGIN', 'login' in input && input.login]
        .filter(Boolean)
        .join('#'),
    };
  }
}

/** helper */
function makeKceForQueryUserLogin(
  input: QueryUserLoginInput,
  {operator}: Pick<QueryOptions, 'operator'>
): string {
  if ('index' in input) {
    if (input.index === 'gsi1') {
      return `#pk = :pk AND ${
        operator === 'begins_with'
          ? 'begins_with(#sk, :sk)'
          : `#sk ${operator} :sk`
      }`;
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return `#pk = :pk AND ${
      operator === 'begins_with'
        ? 'begins_with(#sk, :sk)'
        : `#sk ${operator} :sk`
    }`;
  }
}

/** queryUserLogin */
export async function queryUserLogin(
  input: Readonly<QueryUserLoginInput>,
  {
    limit = undefined,
    nextToken,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryUserLoginOutput>> {
  const tableName = process.env.TABLE_USER_LOGIN;
  assert(tableName, 'TABLE_USER_LOGIN is not set');

  const ExpressionAttributeNames = makeEanForQueryUserLogin(input);
  const ExpressionAttributeValues = makeEavForQueryUserLogin(input);
  const KeyConditionExpression = makeKceForQueryUserLogin(input, {operator});

  const commandInput: QueryCommandInput = {
    ConsistentRead: false,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ExclusiveStartKey: nextToken,
    IndexName: 'index' in input ? input.index : undefined,
    KeyConditionExpression,
    Limit: limit,
    ReturnConsumedCapacity: 'INDEXES',
    ScanIndexForward: !reverse,
    TableName: tableName,
  };

  const {
    ConsumedCapacity: capacity,
    Items: items = [],
    LastEvaluatedKey: lastEvaluatedKey,
  } = await ddbDocClient.send(new QueryCommand(commandInput));

  assert(
    capacity,
    'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
  );

  return {
    capacity,
    hasNextPage: !!lastEvaluatedKey,
    items: items.map((item) => {
      assert(item._et === 'UserLogin', () => new DataIntegrityError('TODO'));
      return unmarshallUserLogin(item);
    }),
    nextToken: lastEvaluatedKey,
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

export type MarshallUserLoginInput = Required<
  Pick<UserLogin, 'externalId' | 'login' | 'vendor'>
> &
  Partial<Pick<UserLogin, 'version'>>;

/** Marshalls a DynamoDB record into a UserLogin object */
export function marshallUserLogin(
  input: MarshallUserLoginInput,
  now = new Date()
): MarshallUserLoginOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
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
    '#pk': 'pk',
    '#externalId': 'external_id',
    '#login': 'login',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
    '#gsi1pk': 'gsi1pk',
    '#gsi1sk': 'gsi1sk',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'UserLogin',
    ':externalId': input.externalId,
    ':login': input.login,
    ':vendor': input.vendor,
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
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
  assert(
    item._ct !== null,
    () => new DataIntegrityError('Expected createdAt to be non-null')
  );
  assert(
    typeof item._ct !== 'undefined',
    () => new DataIntegrityError('Expected createdAt to be defined')
  );

  assert(
    item.external_id !== null,
    () => new DataIntegrityError('Expected externalId to be non-null')
  );
  assert(
    typeof item.external_id !== 'undefined',
    () => new DataIntegrityError('Expected externalId to be defined')
  );

  assert(
    item.login !== null,
    () => new DataIntegrityError('Expected login to be non-null')
  );
  assert(
    typeof item.login !== 'undefined',
    () => new DataIntegrityError('Expected login to be defined')
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
    item.vendor !== null,
    () => new DataIntegrityError('Expected vendor to be non-null')
  );
  assert(
    typeof item.vendor !== 'undefined',
    () => new DataIntegrityError('Expected vendor to be defined')
  );

  assert(
    item._v !== null,
    () => new DataIntegrityError('Expected version to be non-null')
  );
  assert(
    typeof item._v !== 'undefined',
    () => new DataIntegrityError('Expected version to be defined')
  );

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
