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
  makeSortKeyForQuery,
  unmarshallRequiredField,
  unmarshallOptionalField,
  AlreadyExistsError,
  AssertionError,
  BaseDataLibraryError,
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

/** A customer account */
export type Account = Model &
  Node &
  Timestamped &
  Versioned & {
    __typename?: 'Account';
    cancelled?: Maybe<Scalars['Boolean']>;
    createdAt: Scalars['Date'];
    effectiveDate: Scalars['Date'];
    externalId: Scalars['String'];
    id: Scalars['ID'];
    onFreeTrial?: Maybe<Scalars['Boolean']>;
    planName?: Maybe<PlanName>;
    updatedAt: Scalars['Date'];
    vendor: Vendor;
    version: Scalars['Int'];
  };

/** CDC Event Types */
export type CdcEvent = 'INSERT' | 'MODIFY' | 'REMOVE' | 'UPSERT';

/** Possible case types for converting a fieldName to a DynamoDB column_name. */
export type ColumnCase = 'CAMEL_CASE' | 'SNAKE_CASE';

/** Configuration specific to a table dispatcher */
export interface DispatcherConfig {
  lambdaConfig?: InputMaybe<LambdaConfig>;
}

/** Configuration specific to a model handler */
export interface HandlerConfig {
  lambdaConfig?: InputMaybe<LambdaConfig>;
}

/** Reusable options for all generated lambdas */
export interface LambdaConfig {
  /** Measured in megabytes. */
  memory?: InputMaybe<Scalars['Int']>;
  /**
   * Measured in seconds. Reminder that handlers may need to do retries in-band, so
   * consider making this a relatively high number and using alarms to catch
   * timeouts rather than terminating the function. In order to make space for up
   * to 5 retries, please add sixty seconds to your intended timeout.
   */
  timeout?: InputMaybe<Scalars['Int']>;
}

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

/** The available plans. */
export type PlanName = 'ENTERPRISE' | 'OPEN_SOURCE' | 'SMALL_TEAM';

/**
 * INCLUDE is omitted at this time because it drastically complicates the schema
 * DSL. If a use for it arises, it'll be revisited.
 */
export type ProjectionType = 'ALL' | 'KEYS_ONLY';

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

/** Represents an email that is scheduled to be sent to a user. */
export type ScheduledEmail = Model &
  Timestamped &
  Versioned & {
    __typename?: 'ScheduledEmail';
    createdAt: Scalars['Date'];
    externalId: Scalars['String'];
    id: Scalars['ID'];
    sendAt?: Maybe<Scalars['Date']>;
    template: Scalars['String'];
    updatedAt: Scalars['Date'];
    vendor: Vendor;
    version: Scalars['Int'];
  };

/** Represents an email that has been sent to a user */
export type SentEmail = Model &
  Timestamped &
  Versioned & {
    __typename?: 'SentEmail';
    createdAt: Scalars['Date'];
    externalId: Scalars['String'];
    id: Scalars['ID'];
    messageId: Scalars['String'];
    template: Scalars['String'];
    updatedAt: Scalars['Date'];
    vendor: Vendor;
    version: Scalars['Int'];
  };

/** A particular subscription change for an account */
export type Subscription = Model &
  Node &
  Timestamped &
  Versioned & {
    __typename?: 'Subscription';
    cancelled?: Maybe<Scalars['Boolean']>;
    createdAt: Scalars['Date'];
    effectiveDate: Scalars['Date'];
    externalId: Scalars['String'];
    id: Scalars['ID'];
    onFreeTrial?: Maybe<Scalars['Boolean']>;
    planName?: Maybe<PlanName>;
    updatedAt: Scalars['Date'];
    vendor: Vendor;
    version: Scalars['Int'];
  };

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

export interface AccountPrimaryKey {
  externalId: Scalars['String'];
  vendor: Vendor;
}

export type CreateAccountInput = Omit<
  Account,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type CreateAccountOutput = ResultType<Account>;
/**  */
export async function createAccount(
  input: Readonly<CreateAccountInput>
): Promise<Readonly<CreateAccountOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallAccount(input, now);

  try {
    // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
    // cannot return the newly written values.
    const commandInput: UpdateCommandInput = {
      ConditionExpression: 'attribute_not_exists(#pk)',
      ExpressionAttributeNames: {
        ...ExpressionAttributeNames,
        '#createdAt': '_ct',

        '#lsi1sk': 'lsi1sk',
      },
      ExpressionAttributeValues: {
        ...ExpressionAttributeValues,
        ':createdAt': now.getTime(),

        ':lsi1sk': ['INSTANCE', now.getTime()].join('#'),
      },
      Key: {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['SUMMARY'].join('#'),
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: [
        ...UpdateExpression.split(', '),
        '#createdAt = :createdAt',

        '#lsi1sk = :lsi1sk',
      ].join(', '),
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

    assert(item, 'Expected DynamoDB to return an Attributes prop.');
    assert(
      item._et === 'Account',
      () =>
        new DataIntegrityError(
          `Expected to write Account but wrote ${item?._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallAccount(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new AlreadyExistsError('Account', {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['SUMMARY'].join('#'),
      });
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type BlindWriteAccountInput = Omit<
  Account,
  'createdAt' | 'id' | 'updatedAt' | 'version'
> &
  Partial<Pick<Account, 'createdAt'>>;

export type BlindWriteAccountOutput = ResultType<Account>;
/** */
export async function blindWriteAccount(
  input: Readonly<BlindWriteAccountInput>
): Promise<Readonly<BlindWriteAccountOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');
  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallAccount(input, now);

  delete ExpressionAttributeNames['#pk'];
  delete ExpressionAttributeValues[':version'];

  const ean = {
    ...ExpressionAttributeNames,
    '#createdAt': '_ct',

    '#lsi1sk': 'lsi1sk',
  };
  const eav = {
    ...ExpressionAttributeValues,
    ':one': 1,
    ':createdAt': now.getTime(),

    ':lsi1sk': [
      'INSTANCE',
      'createdAt' in input && typeof input.createdAt !== 'undefined'
        ? input.createdAt.getTime()
        : now.getTime(),
    ].join('#'),
  };
  const ue = `${[
    ...UpdateExpression.split(', ').filter((e) => !e.startsWith('#version')),
    '#createdAt = if_not_exists(#createdAt, :createdAt)',

    '#lsi1sk = :lsi1sk',
  ].join(', ')} ADD #version :one`;

  const commandInput: UpdateCommandInput = {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    Key: {
      pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
      sk: ['SUMMARY'].join('#'),
    },
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'ALL_NEW',
    TableName: tableName,
    UpdateExpression: ue,
  };

  try {
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
      item._et === 'Account',
      () =>
        new DataIntegrityError(
          `Expected to write Account but wrote ${item?._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallAccount(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type DeleteAccountOutput = ResultType<void>;

/**  */
export async function deleteAccount(
  input: AccountPrimaryKey
): Promise<DeleteAccountOutput> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  try {
    const commandInput: DeleteCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      Key: {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['SUMMARY'].join('#'),
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
      throw new NotFoundError('Account', input);
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type ReadAccountOutput = ResultType<Account>;

/**  */
export async function readAccount(
  input: AccountPrimaryKey
): Promise<Readonly<ReadAccountOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: false,
    Key: {
      pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
      sk: ['SUMMARY'].join('#'),
    },
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  };

  try {
    const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
      new GetCommand(commandInput)
    );

    assert(
      capacity,
      'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
    );

    assert(item, () => new NotFoundError('Account', input));
    assert(
      item._et === 'Account',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify(input)} to load a Account but loaded ${
            item._et
          } instead`
        )
    );

    return {
      capacity,
      item: unmarshallAccount(item),
      metrics: undefined,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type UpdateAccountInput = Omit<
  Account,
  'createdAt' | 'id' | 'updatedAt'
>;
export type UpdateAccountOutput = ResultType<Account>;

/**  */
export async function updateAccount(
  input: Readonly<UpdateAccountInput>
): Promise<Readonly<UpdateAccountOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallAccount(input);
  try {
    let previousVersionCE = '';
    let previousVersionEAV = {};
    if ('version' in input && typeof input.version !== 'undefined') {
      previousVersionCE = '#version = :previousVersion AND ';
      previousVersionEAV = {':previousVersion': input.version};
    }
    const commandInput: UpdateCommandInput = {
      ConditionExpression: `${previousVersionCE}#entity = :entity AND attribute_exists(#pk)`,
      ExpressionAttributeNames,
      ExpressionAttributeValues: {
        ...ExpressionAttributeValues,
        ...previousVersionEAV,
      },
      Key: {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['SUMMARY'].join('#'),
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

    assert(item, 'Expected DynamoDB to return an Attributes prop.');
    assert(
      item._et === 'Account',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify({
            externalId: input.externalId,
            vendor: input.vendor,
          })} to update a Account but updated ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallAccount(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        await readAccount(input);
      } catch {
        throw new NotFoundError('Account', {
          externalId: input.externalId,
          vendor: input.vendor,
        });
      }
      throw new OptimisticLockingError('Account', {
        externalId: input.externalId,
        vendor: input.vendor,
      });
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type QueryAccountInput =
  | {externalId: Scalars['String']; vendor: Vendor}
  | {index: 'lsi1'; externalId: Scalars['String']; vendor: Vendor}
  | {
      index: 'lsi1';
      createdAt: Scalars['Date'];
      externalId: Scalars['String'];
      vendor: Vendor;
    };
export type QueryAccountOutput = MultiResultType<Account>;

/** helper */
function makeEanForQueryAccount(
  input: QueryAccountInput
): Record<string, string> {
  if ('index' in input) {
    if (input.index === 'lsi1') {
      return {'#pk': 'pk', '#sk': 'lsi1sk'};
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {'#pk': 'pk', '#sk': 'sk'};
  }
}

/** helper */
function makeEavForQueryAccount(input: QueryAccountInput): Record<string, any> {
  if ('index' in input) {
    if (input.index === 'lsi1') {
      return {
        ':pk': ['ACCOUNT', input.vendor, input.externalId].join('#'),
        ':sk': makeSortKeyForQuery('INSTANCE', ['createdAt'], input),
      };
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {
      ':pk': ['ACCOUNT', input.vendor, input.externalId].join('#'),
      ':sk': makeSortKeyForQuery('SUMMARY', [], input),
    };
  }
}

/** helper */
function makeKceForQueryAccount(
  input: QueryAccountInput,
  {operator}: Pick<QueryOptions, 'operator'>
): string {
  if ('index' in input) {
    if (input.index === 'lsi1') {
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

/** queryAccount */
export async function queryAccount(
  input: Readonly<QueryAccountInput>,
  {
    limit = undefined,
    nextToken,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryAccountOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  const ExpressionAttributeNames = makeEanForQueryAccount(input);
  const ExpressionAttributeValues = makeEavForQueryAccount(input);
  const KeyConditionExpression = makeKceForQueryAccount(input, {operator});

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

  try {
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
        assert(
          item._et === 'Account',
          () =>
            new DataIntegrityError(
              `Query result included at item with type ${item._et}. Only Account was expected.`
            )
        );
        return unmarshallAccount(item);
      }),
      nextToken: lastEvaluatedKey,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

/** queries the Account table by primary key using a node id */
export async function queryAccountByNodeId(
  id: Scalars['ID']
): Promise<Readonly<Omit<ResultType<Account>, 'metrics'>>> {
  const primaryKeyValues = Base64.decode(id)
    .split(':')
    .slice(1)
    .join(':')
    .split('#');

  const primaryKey: QueryAccountInput = {
    vendor: primaryKeyValues[1] as Vendor,
    externalId: primaryKeyValues[2],
  };

  const {capacity, items} = await queryAccount(primaryKey);

  assert(items.length > 0, () => new NotFoundError('Account', primaryKey));
  assert(
    items.length < 2,
    () => new DataIntegrityError(`Found multiple Account with id ${id}`)
  );

  return {capacity, item: items[0]};
}

export interface MarshallAccountOutput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type MarshallAccountInput = Required<
  Pick<Account, 'effectiveDate' | 'externalId' | 'vendor'>
> &
  Partial<Pick<Account, 'cancelled' | 'onFreeTrial' | 'planName' | 'version'>>;

/** Marshalls a DynamoDB record into a Account object */
export function marshallAccount(
  input: MarshallAccountInput,
  now = new Date()
): MarshallAccountOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
    '#effectiveDate = :effectiveDate',
    '#externalId = :externalId',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#effectiveDate': 'effective_date',
    '#externalId': 'external_id',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'Account',
    ':effectiveDate':
      input.effectiveDate === null ? null : input.effectiveDate.toISOString(),
    ':externalId': input.externalId,
    ':vendor': input.vendor,
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
  };

  if ('cancelled' in input && typeof input.cancelled !== 'undefined') {
    ean['#cancelled'] = 'cancelled';
    eav[':cancelled'] = input.cancelled;
    updateExpression.push('#cancelled = :cancelled');
  }

  if ('onFreeTrial' in input && typeof input.onFreeTrial !== 'undefined') {
    ean['#onFreeTrial'] = 'on_free_trial';
    eav[':onFreeTrial'] = input.onFreeTrial;
    updateExpression.push('#onFreeTrial = :onFreeTrial');
  }

  if ('planName' in input && typeof input.planName !== 'undefined') {
    ean['#planName'] = 'plan_name';
    eav[':planName'] = input.planName;
    updateExpression.push('#planName = :planName');
  }
  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
  };
}

/** Unmarshalls a DynamoDB record into a Account object */
export function unmarshallAccount(item: Record<string, any>): Account {
  let result: Account = {
    createdAt: unmarshallRequiredField(
      item,
      'createdAt',
      ['_ct'],
      (v) => new Date(v)
    ),
    effectiveDate: unmarshallRequiredField(
      item,
      'effectiveDate',
      ['effective_date', 'effectiveDate'],
      (v) => new Date(v)
    ),
    externalId: unmarshallRequiredField(item, 'externalId', [
      'external_id',
      'externalId',
    ]),
    id: Base64.encode(`Account:${item.pk}#:#${item.sk}`),
    updatedAt: unmarshallRequiredField(
      item,
      'updatedAt',
      ['_md'],
      (v) => new Date(v)
    ),
    vendor: unmarshallRequiredField(item, 'vendor', ['vendor', 'vendor']),
    version: unmarshallRequiredField(item, 'version', ['_v']),
  };

  if ('cancelled' in item || 'cancelled' in item) {
    result = {
      ...result,
      cancelled: unmarshallOptionalField(item, 'cancelled', [
        'cancelled',
        'cancelled',
      ]),
    };
  }
  if ('on_free_trial' in item || 'onFreeTrial' in item) {
    result = {
      ...result,
      onFreeTrial: unmarshallOptionalField(item, 'onFreeTrial', [
        'on_free_trial',
        'onFreeTrial',
      ]),
    };
  }
  if ('plan_name' in item || 'planName' in item) {
    result = {
      ...result,
      planName: unmarshallOptionalField(item, 'planName', [
        'plan_name',
        'planName',
      ]),
    };
  }

  return result;
}

export interface ScheduledEmailPrimaryKey {
  externalId: Scalars['String'];
  template: Scalars['String'];
  vendor: Vendor;
}

export type CreateScheduledEmailInput = Omit<
  ScheduledEmail,
  'createdAt' | 'id' | 'sendAt' | 'updatedAt' | 'version'
> &
  Partial<Pick<ScheduledEmail, 'sendAt'>>;
export type CreateScheduledEmailOutput = ResultType<ScheduledEmail>;
/**  */
export async function createScheduledEmail(
  input: Readonly<CreateScheduledEmailInput>
): Promise<Readonly<CreateScheduledEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallScheduledEmail(input, now);

  try {
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
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['SCHEDULED_EMAIL', input.template].join('#'),
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: [
        ...UpdateExpression.split(', '),
        '#createdAt = :createdAt',
      ].join(', '),
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

    assert(item, 'Expected DynamoDB to return an Attributes prop.');
    assert(
      item._et === 'ScheduledEmail',
      () =>
        new DataIntegrityError(
          `Expected to write ScheduledEmail but wrote ${item?._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallScheduledEmail(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new AlreadyExistsError('ScheduledEmail', {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['SCHEDULED_EMAIL', input.template].join('#'),
      });
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type BlindWriteScheduledEmailInput = Omit<
  ScheduledEmail,
  'createdAt' | 'id' | 'sendAt' | 'updatedAt' | 'version'
> &
  Partial<Pick<ScheduledEmail, 'sendAt'>> &
  Partial<Pick<ScheduledEmail, 'createdAt'>>;

export type BlindWriteScheduledEmailOutput = ResultType<ScheduledEmail>;
/** */
export async function blindWriteScheduledEmail(
  input: Readonly<BlindWriteScheduledEmailInput>
): Promise<Readonly<BlindWriteScheduledEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');
  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallScheduledEmail(input, now);

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
      pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
      sk: ['SCHEDULED_EMAIL', input.template].join('#'),
    },
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'ALL_NEW',
    TableName: tableName,
    UpdateExpression: ue,
  };

  try {
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
      item._et === 'ScheduledEmail',
      () =>
        new DataIntegrityError(
          `Expected to write ScheduledEmail but wrote ${item?._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallScheduledEmail(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type DeleteScheduledEmailOutput = ResultType<void>;

/**  */
export async function deleteScheduledEmail(
  input: ScheduledEmailPrimaryKey
): Promise<DeleteScheduledEmailOutput> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  try {
    const commandInput: DeleteCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      Key: {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['SCHEDULED_EMAIL', input.template].join('#'),
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
      throw new NotFoundError('ScheduledEmail', input);
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type ReadScheduledEmailOutput = ResultType<ScheduledEmail>;

/**  */
export async function readScheduledEmail(
  input: ScheduledEmailPrimaryKey
): Promise<Readonly<ReadScheduledEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: false,
    Key: {
      pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
      sk: ['SCHEDULED_EMAIL', input.template].join('#'),
    },
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  };

  try {
    const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
      new GetCommand(commandInput)
    );

    assert(
      capacity,
      'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
    );

    assert(item, () => new NotFoundError('ScheduledEmail', input));
    assert(
      item._et === 'ScheduledEmail',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify(
            input
          )} to load a ScheduledEmail but loaded ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallScheduledEmail(item),
      metrics: undefined,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type UpdateScheduledEmailInput = Omit<
  ScheduledEmail,
  'createdAt' | 'id' | 'sendAt' | 'updatedAt'
> &
  Partial<Pick<ScheduledEmail, 'sendAt'>>;
export type UpdateScheduledEmailOutput = ResultType<ScheduledEmail>;

/**  */
export async function updateScheduledEmail(
  input: Readonly<UpdateScheduledEmailInput>
): Promise<Readonly<UpdateScheduledEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallScheduledEmail(input);
  try {
    let previousVersionCE = '';
    let previousVersionEAV = {};
    if ('version' in input && typeof input.version !== 'undefined') {
      previousVersionCE = '#version = :previousVersion AND ';
      previousVersionEAV = {':previousVersion': input.version};
    }
    const commandInput: UpdateCommandInput = {
      ConditionExpression: `${previousVersionCE}#entity = :entity AND attribute_exists(#pk)`,
      ExpressionAttributeNames,
      ExpressionAttributeValues: {
        ...ExpressionAttributeValues,
        ...previousVersionEAV,
      },
      Key: {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['SCHEDULED_EMAIL', input.template].join('#'),
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

    assert(item, 'Expected DynamoDB to return an Attributes prop.');
    assert(
      item._et === 'ScheduledEmail',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify({
            externalId: input.externalId,
            template: input.template,
            vendor: input.vendor,
          })} to update a ScheduledEmail but updated ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallScheduledEmail(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        await readScheduledEmail(input);
      } catch {
        throw new NotFoundError('ScheduledEmail', {
          externalId: input.externalId,
          template: input.template,
          vendor: input.vendor,
        });
      }
      throw new OptimisticLockingError('ScheduledEmail', {
        externalId: input.externalId,
        template: input.template,
        vendor: input.vendor,
      });
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type QueryScheduledEmailInput =
  | {externalId: Scalars['String']; vendor: Vendor}
  | {
      externalId: Scalars['String'];
      template: Scalars['String'];
      vendor: Vendor;
    };
export type QueryScheduledEmailOutput = MultiResultType<ScheduledEmail>;

/** helper */
function makeEanForQueryScheduledEmail(
  input: QueryScheduledEmailInput
): Record<string, string> {
  if ('index' in input) {
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {'#pk': 'pk', '#sk': 'sk'};
  }
}

/** helper */
function makeEavForQueryScheduledEmail(
  input: QueryScheduledEmailInput
): Record<string, any> {
  if ('index' in input) {
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {
      ':pk': ['ACCOUNT', input.vendor, input.externalId].join('#'),
      ':sk': makeSortKeyForQuery('SCHEDULED_EMAIL', ['template'], input),
    };
  }
}

/** helper */
function makeKceForQueryScheduledEmail(
  input: QueryScheduledEmailInput,
  {operator}: Pick<QueryOptions, 'operator'>
): string {
  if ('index' in input) {
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

/** queryScheduledEmail */
export async function queryScheduledEmail(
  input: Readonly<QueryScheduledEmailInput>,
  {
    limit = undefined,
    nextToken,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryScheduledEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  const ExpressionAttributeNames = makeEanForQueryScheduledEmail(input);
  const ExpressionAttributeValues = makeEavForQueryScheduledEmail(input);
  const KeyConditionExpression = makeKceForQueryScheduledEmail(input, {
    operator,
  });

  const commandInput: QueryCommandInput = {
    ConsistentRead: false,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ExclusiveStartKey: nextToken,
    IndexName: undefined,
    KeyConditionExpression,
    Limit: limit,
    ReturnConsumedCapacity: 'INDEXES',
    ScanIndexForward: !reverse,
    TableName: tableName,
  };

  try {
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
        assert(
          item._et === 'ScheduledEmail',
          () =>
            new DataIntegrityError(
              `Query result included at item with type ${item._et}. Only ScheduledEmail was expected.`
            )
        );
        return unmarshallScheduledEmail(item);
      }),
      nextToken: lastEvaluatedKey,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

/** queries the ScheduledEmail table by primary key using a node id */
export async function queryScheduledEmailByNodeId(
  id: Scalars['ID']
): Promise<Readonly<Omit<ResultType<ScheduledEmail>, 'metrics'>>> {
  const primaryKeyValues = Base64.decode(id)
    .split(':')
    .slice(1)
    .join(':')
    .split('#');

  const primaryKey: QueryScheduledEmailInput = {
    vendor: primaryKeyValues[1] as Vendor,
    externalId: primaryKeyValues[2],
  };

  if (typeof primaryKeyValues[2] !== 'undefined') {
    // @ts-ignore - TSC will usually see this as an error because it determined
    // that primaryKey is the no-sort-fields-specified version of the type.
    primaryKey.template = primaryKeyValues[5];
  }

  const {capacity, items} = await queryScheduledEmail(primaryKey);

  assert(
    items.length > 0,
    () => new NotFoundError('ScheduledEmail', primaryKey)
  );
  assert(
    items.length < 2,
    () => new DataIntegrityError(`Found multiple ScheduledEmail with id ${id}`)
  );

  return {capacity, item: items[0]};
}

export interface MarshallScheduledEmailOutput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type MarshallScheduledEmailInput = Required<
  Pick<ScheduledEmail, 'externalId' | 'template' | 'vendor'>
> &
  Partial<Pick<ScheduledEmail, 'sendAt' | 'version'>>;

/** Marshalls a DynamoDB record into a ScheduledEmail object */
export function marshallScheduledEmail(
  input: MarshallScheduledEmailInput,
  now = new Date()
): MarshallScheduledEmailOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
    '#externalId = :externalId',
    '#template = :template',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#externalId': 'external_id',
    '#template': 'template',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'ScheduledEmail',
    ':externalId': input.externalId,
    ':template': input.template,
    ':vendor': input.vendor,
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
  };

  if ('sendAt' in input && typeof input.sendAt !== 'undefined') {
    assert(
      !Number.isNaN(input.sendAt?.getTime()),
      'sendAt was passed but is not a valid date'
    );
    ean['#sendAt'] = 'ttl';
    eav[':sendAt'] =
      input.sendAt === null ? null : Math.floor(input.sendAt.getTime() / 1000);
    updateExpression.push('#sendAt = :sendAt');
  } else {
    ean['#sendAt'] = 'ttl';
    eav[':sendAt'] = now.getTime() + 86400000;
    updateExpression.push('#sendAt = :sendAt');
  }

  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
  };
}

/** Unmarshalls a DynamoDB record into a ScheduledEmail object */
export function unmarshallScheduledEmail(
  item: Record<string, any>
): ScheduledEmail {
  let result: ScheduledEmail = {
    createdAt: unmarshallRequiredField(
      item,
      'createdAt',
      ['_ct'],
      (v) => new Date(v)
    ),
    externalId: unmarshallRequiredField(item, 'externalId', [
      'external_id',
      'externalId',
    ]),
    id: Base64.encode(`ScheduledEmail:${item.pk}#:#${item.sk}`),
    template: unmarshallRequiredField(item, 'template', [
      'template',
      'template',
    ]),
    updatedAt: unmarshallRequiredField(
      item,
      'updatedAt',
      ['_md'],
      (v) => new Date(v)
    ),
    vendor: unmarshallRequiredField(item, 'vendor', ['vendor', 'vendor']),
    version: unmarshallRequiredField(item, 'version', ['_v']),
  };

  if ('ttl' in item && item.ttl !== null) {
    result = {
      ...result,
      sendAt: unmarshallOptionalField(
        item,
        'sendAt',
        ['ttl'],
        (v) => new Date(v * 1000)
      ),
    };
  }

  return result;
}

export interface SentEmailPrimaryKey {
  createdAt: Scalars['Date'];
  externalId: Scalars['String'];
  template: Scalars['String'];
  vendor: Vendor;
}

export type CreateSentEmailInput = Omit<
  SentEmail,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type CreateSentEmailOutput = ResultType<SentEmail>;
/**  */
export async function createSentEmail(
  input: Readonly<CreateSentEmailInput>
): Promise<Readonly<CreateSentEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSentEmail(input, now);

  try {
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
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['TEMPLATE', input.template, now.getTime()].join('#'),
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: [
        ...UpdateExpression.split(', '),
        '#createdAt = :createdAt',
      ].join(', '),
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

    assert(item, 'Expected DynamoDB to return an Attributes prop.');
    assert(
      item._et === 'SentEmail',
      () =>
        new DataIntegrityError(
          `Expected to write SentEmail but wrote ${item?._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallSentEmail(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new AlreadyExistsError('SentEmail', {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['TEMPLATE', input.template, now.getTime()].join('#'),
      });
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type BlindWriteSentEmailInput = Omit<
  SentEmail,
  'createdAt' | 'id' | 'updatedAt' | 'version'
> &
  Partial<Pick<SentEmail, 'createdAt'>>;

export type BlindWriteSentEmailOutput = ResultType<SentEmail>;
/** */
export async function blindWriteSentEmail(
  input: Readonly<BlindWriteSentEmailInput>
): Promise<Readonly<BlindWriteSentEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');
  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSentEmail(input, now);

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
      pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
      sk: [
        'TEMPLATE',
        input.template,
        'createdAt' in input && typeof input.createdAt !== 'undefined'
          ? input.createdAt.getTime()
          : now.getTime(),
      ].join('#'),
    },
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'ALL_NEW',
    TableName: tableName,
    UpdateExpression: ue,
  };

  try {
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
      item._et === 'SentEmail',
      () =>
        new DataIntegrityError(
          `Expected to write SentEmail but wrote ${item?._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallSentEmail(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type DeleteSentEmailOutput = ResultType<void>;

/**  */
export async function deleteSentEmail(
  input: SentEmailPrimaryKey
): Promise<DeleteSentEmailOutput> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  try {
    const commandInput: DeleteCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      Key: {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['TEMPLATE', input.template, input.createdAt.getTime()].join('#'),
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
      throw new NotFoundError('SentEmail', input);
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type ReadSentEmailOutput = ResultType<SentEmail>;

/**  */
export async function readSentEmail(
  input: SentEmailPrimaryKey
): Promise<Readonly<ReadSentEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: false,
    Key: {
      pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
      sk: ['TEMPLATE', input.template, input.createdAt.getTime()].join('#'),
    },
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  };

  try {
    const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
      new GetCommand(commandInput)
    );

    assert(
      capacity,
      'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
    );

    assert(item, () => new NotFoundError('SentEmail', input));
    assert(
      item._et === 'SentEmail',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify(input)} to load a SentEmail but loaded ${
            item._et
          } instead`
        )
    );

    return {
      capacity,
      item: unmarshallSentEmail(item),
      metrics: undefined,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type UpdateSentEmailInput = Omit<SentEmail, 'id' | 'updatedAt'>;
export type UpdateSentEmailOutput = ResultType<SentEmail>;

/**  */
export async function updateSentEmail(
  input: Readonly<UpdateSentEmailInput>
): Promise<Readonly<UpdateSentEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSentEmail(input);
  try {
    let previousVersionCE = '';
    let previousVersionEAV = {};
    if ('version' in input && typeof input.version !== 'undefined') {
      previousVersionCE = '#version = :previousVersion AND ';
      previousVersionEAV = {':previousVersion': input.version};
    }
    const commandInput: UpdateCommandInput = {
      ConditionExpression: `${previousVersionCE}#entity = :entity AND attribute_exists(#pk)`,
      ExpressionAttributeNames,
      ExpressionAttributeValues: {
        ...ExpressionAttributeValues,
        ...previousVersionEAV,
      },
      Key: {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: ['TEMPLATE', input.template, input.createdAt.getTime()].join('#'),
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

    assert(item, 'Expected DynamoDB to return an Attributes prop.');
    assert(
      item._et === 'SentEmail',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify({
            createdAt: input.createdAt,
            externalId: input.externalId,
            template: input.template,
            vendor: input.vendor,
          })} to update a SentEmail but updated ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallSentEmail(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        await readSentEmail(input);
      } catch {
        throw new NotFoundError('SentEmail', {
          createdAt: input.createdAt,
          externalId: input.externalId,
          template: input.template,
          vendor: input.vendor,
        });
      }
      throw new OptimisticLockingError('SentEmail', {
        createdAt: input.createdAt,
        externalId: input.externalId,
        template: input.template,
        vendor: input.vendor,
      });
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type QuerySentEmailInput =
  | {externalId: Scalars['String']; vendor: Vendor}
  | {externalId: Scalars['String']; template: Scalars['String']; vendor: Vendor}
  | {
      createdAt: Scalars['Date'];
      externalId: Scalars['String'];
      template: Scalars['String'];
      vendor: Vendor;
    };
export type QuerySentEmailOutput = MultiResultType<SentEmail>;

/** helper */
function makeEanForQuerySentEmail(
  input: QuerySentEmailInput
): Record<string, string> {
  if ('index' in input) {
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {'#pk': 'pk', '#sk': 'sk'};
  }
}

/** helper */
function makeEavForQuerySentEmail(
  input: QuerySentEmailInput
): Record<string, any> {
  if ('index' in input) {
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {
      ':pk': ['ACCOUNT', input.vendor, input.externalId].join('#'),
      ':sk': makeSortKeyForQuery('TEMPLATE', ['template', 'createdAt'], input),
    };
  }
}

/** helper */
function makeKceForQuerySentEmail(
  input: QuerySentEmailInput,
  {operator}: Pick<QueryOptions, 'operator'>
): string {
  if ('index' in input) {
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

/** querySentEmail */
export async function querySentEmail(
  input: Readonly<QuerySentEmailInput>,
  {
    limit = undefined,
    nextToken,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QuerySentEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  const ExpressionAttributeNames = makeEanForQuerySentEmail(input);
  const ExpressionAttributeValues = makeEavForQuerySentEmail(input);
  const KeyConditionExpression = makeKceForQuerySentEmail(input, {operator});

  const commandInput: QueryCommandInput = {
    ConsistentRead: false,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ExclusiveStartKey: nextToken,
    IndexName: undefined,
    KeyConditionExpression,
    Limit: limit,
    ReturnConsumedCapacity: 'INDEXES',
    ScanIndexForward: !reverse,
    TableName: tableName,
  };

  try {
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
        assert(
          item._et === 'SentEmail',
          () =>
            new DataIntegrityError(
              `Query result included at item with type ${item._et}. Only SentEmail was expected.`
            )
        );
        return unmarshallSentEmail(item);
      }),
      nextToken: lastEvaluatedKey,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

/** queries the SentEmail table by primary key using a node id */
export async function querySentEmailByNodeId(
  id: Scalars['ID']
): Promise<Readonly<Omit<ResultType<SentEmail>, 'metrics'>>> {
  const primaryKeyValues = Base64.decode(id)
    .split(':')
    .slice(1)
    .join(':')
    .split('#');

  const primaryKey: QuerySentEmailInput = {
    vendor: primaryKeyValues[1] as Vendor,
    externalId: primaryKeyValues[2],
  };

  if (typeof primaryKeyValues[2] !== 'undefined') {
    // @ts-ignore - TSC will usually see this as an error because it determined
    // that primaryKey is the no-sort-fields-specified version of the type.
    primaryKey.template = primaryKeyValues[5];
  }

  if (typeof primaryKeyValues[3] !== 'undefined') {
    // @ts-ignore - TSC will usually see this as an error because it determined
    // that primaryKey is the no-sort-fields-specified version of the type.
    primaryKey.createdAt = new Date(primaryKeyValues[6]);
  }

  const {capacity, items} = await querySentEmail(primaryKey);

  assert(items.length > 0, () => new NotFoundError('SentEmail', primaryKey));
  assert(
    items.length < 2,
    () => new DataIntegrityError(`Found multiple SentEmail with id ${id}`)
  );

  return {capacity, item: items[0]};
}

export interface MarshallSentEmailOutput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type MarshallSentEmailInput = Required<
  Pick<SentEmail, 'externalId' | 'messageId' | 'template' | 'vendor'>
> &
  Partial<Pick<SentEmail, 'version'>>;

/** Marshalls a DynamoDB record into a SentEmail object */
export function marshallSentEmail(
  input: MarshallSentEmailInput,
  now = new Date()
): MarshallSentEmailOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
    '#externalId = :externalId',
    '#messageId = :messageId',
    '#template = :template',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#externalId': 'external_id',
    '#messageId': 'message_id',
    '#template': 'template',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'SentEmail',
    ':externalId': input.externalId,
    ':messageId': input.messageId,
    ':template': input.template,
    ':vendor': input.vendor,
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
  };

  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
  };
}

/** Unmarshalls a DynamoDB record into a SentEmail object */
export function unmarshallSentEmail(item: Record<string, any>): SentEmail {
  const result: SentEmail = {
    createdAt: unmarshallRequiredField(
      item,
      'createdAt',
      ['_ct'],
      (v) => new Date(v)
    ),
    externalId: unmarshallRequiredField(item, 'externalId', [
      'external_id',
      'externalId',
    ]),
    id: Base64.encode(`SentEmail:${item.pk}#:#${item.sk}`),
    messageId: unmarshallRequiredField(item, 'messageId', [
      'message_id',
      'messageId',
    ]),
    template: unmarshallRequiredField(item, 'template', [
      'template',
      'template',
    ]),
    updatedAt: unmarshallRequiredField(
      item,
      'updatedAt',
      ['_md'],
      (v) => new Date(v)
    ),
    vendor: unmarshallRequiredField(item, 'vendor', ['vendor', 'vendor']),
    version: unmarshallRequiredField(item, 'version', ['_v']),
  };

  return result;
}

export interface SubscriptionPrimaryKey {
  effectiveDate: Scalars['Date'];
  externalId: Scalars['String'];
  vendor: Vendor;
}

export type CreateSubscriptionInput = Omit<
  Subscription,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type CreateSubscriptionOutput = ResultType<Subscription>;
/**  */
export async function createSubscription(
  input: Readonly<CreateSubscriptionInput>
): Promise<Readonly<CreateSubscriptionOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSubscription(input, now);

  try {
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
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: [
          'SUBSCRIPTION',
          input.effectiveDate === null
            ? null
            : input.effectiveDate.toISOString(),
        ].join('#'),
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: [
        ...UpdateExpression.split(', '),
        '#createdAt = :createdAt',
      ].join(', '),
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

    assert(item, 'Expected DynamoDB to return an Attributes prop.');
    assert(
      item._et === 'Subscription',
      () =>
        new DataIntegrityError(
          `Expected to write Subscription but wrote ${item?._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallSubscription(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new AlreadyExistsError('Subscription', {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: [
          'SUBSCRIPTION',
          input.effectiveDate === null
            ? null
            : input.effectiveDate.toISOString(),
        ].join('#'),
      });
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type BlindWriteSubscriptionInput = Omit<
  Subscription,
  'createdAt' | 'id' | 'updatedAt' | 'version'
> &
  Partial<Pick<Subscription, 'createdAt'>>;

export type BlindWriteSubscriptionOutput = ResultType<Subscription>;
/** */
export async function blindWriteSubscription(
  input: Readonly<BlindWriteSubscriptionInput>
): Promise<Readonly<BlindWriteSubscriptionOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');
  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSubscription(input, now);

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
      pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
      sk: [
        'SUBSCRIPTION',
        input.effectiveDate === null ? null : input.effectiveDate.toISOString(),
      ].join('#'),
    },
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'ALL_NEW',
    TableName: tableName,
    UpdateExpression: ue,
  };

  try {
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
      item._et === 'Subscription',
      () =>
        new DataIntegrityError(
          `Expected to write Subscription but wrote ${item?._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallSubscription(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type DeleteSubscriptionOutput = ResultType<void>;

/**  */
export async function deleteSubscription(
  input: SubscriptionPrimaryKey
): Promise<DeleteSubscriptionOutput> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  try {
    const commandInput: DeleteCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      Key: {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: [
          'SUBSCRIPTION',
          input.effectiveDate === null
            ? null
            : input.effectiveDate.toISOString(),
        ].join('#'),
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
      throw new NotFoundError('Subscription', input);
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type ReadSubscriptionOutput = ResultType<Subscription>;

/**  */
export async function readSubscription(
  input: SubscriptionPrimaryKey
): Promise<Readonly<ReadSubscriptionOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: false,
    Key: {
      pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
      sk: [
        'SUBSCRIPTION',
        input.effectiveDate === null ? null : input.effectiveDate.toISOString(),
      ].join('#'),
    },
    ReturnConsumedCapacity: 'INDEXES',
    TableName: tableName,
  };

  try {
    const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
      new GetCommand(commandInput)
    );

    assert(
      capacity,
      'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
    );

    assert(item, () => new NotFoundError('Subscription', input));
    assert(
      item._et === 'Subscription',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify(
            input
          )} to load a Subscription but loaded ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallSubscription(item),
      metrics: undefined,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type UpdateSubscriptionInput = Omit<
  Subscription,
  'createdAt' | 'id' | 'updatedAt'
>;
export type UpdateSubscriptionOutput = ResultType<Subscription>;

/**  */
export async function updateSubscription(
  input: Readonly<UpdateSubscriptionInput>
): Promise<Readonly<UpdateSubscriptionOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSubscription(input);
  try {
    let previousVersionCE = '';
    let previousVersionEAV = {};
    if ('version' in input && typeof input.version !== 'undefined') {
      previousVersionCE = '#version = :previousVersion AND ';
      previousVersionEAV = {':previousVersion': input.version};
    }
    const commandInput: UpdateCommandInput = {
      ConditionExpression: `${previousVersionCE}#entity = :entity AND attribute_exists(#pk)`,
      ExpressionAttributeNames,
      ExpressionAttributeValues: {
        ...ExpressionAttributeValues,
        ...previousVersionEAV,
      },
      Key: {
        pk: ['ACCOUNT', input.vendor, input.externalId].join('#'),
        sk: [
          'SUBSCRIPTION',
          input.effectiveDate === null
            ? null
            : input.effectiveDate.toISOString(),
        ].join('#'),
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

    assert(item, 'Expected DynamoDB to return an Attributes prop.');
    assert(
      item._et === 'Subscription',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify({
            effectiveDate: input.effectiveDate,
            externalId: input.externalId,
            vendor: input.vendor,
          })} to update a Subscription but updated ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallSubscription(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        await readSubscription(input);
      } catch {
        throw new NotFoundError('Subscription', {
          effectiveDate: input.effectiveDate,
          externalId: input.externalId,
          vendor: input.vendor,
        });
      }
      throw new OptimisticLockingError('Subscription', {
        effectiveDate: input.effectiveDate,
        externalId: input.externalId,
        vendor: input.vendor,
      });
    }

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type QuerySubscriptionInput =
  | {externalId: Scalars['String']; vendor: Vendor}
  | {
      effectiveDate: Scalars['Date'];
      externalId: Scalars['String'];
      vendor: Vendor;
    };
export type QuerySubscriptionOutput = MultiResultType<Subscription>;

/** helper */
function makeEanForQuerySubscription(
  input: QuerySubscriptionInput
): Record<string, string> {
  if ('index' in input) {
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {'#pk': 'pk', '#sk': 'sk'};
  }
}

/** helper */
function makeEavForQuerySubscription(
  input: QuerySubscriptionInput
): Record<string, any> {
  if ('index' in input) {
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {
      ':pk': ['ACCOUNT', input.vendor, input.externalId].join('#'),
      ':sk': makeSortKeyForQuery('SUBSCRIPTION', ['effectiveDate'], input),
    };
  }
}

/** helper */
function makeKceForQuerySubscription(
  input: QuerySubscriptionInput,
  {operator}: Pick<QueryOptions, 'operator'>
): string {
  if ('index' in input) {
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

/** querySubscription */
export async function querySubscription(
  input: Readonly<QuerySubscriptionInput>,
  {
    limit = undefined,
    nextToken,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QuerySubscriptionOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  const ExpressionAttributeNames = makeEanForQuerySubscription(input);
  const ExpressionAttributeValues = makeEavForQuerySubscription(input);
  const KeyConditionExpression = makeKceForQuerySubscription(input, {operator});

  const commandInput: QueryCommandInput = {
    ConsistentRead: false,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ExclusiveStartKey: nextToken,
    IndexName: undefined,
    KeyConditionExpression,
    Limit: limit,
    ReturnConsumedCapacity: 'INDEXES',
    ScanIndexForward: !reverse,
    TableName: tableName,
  };

  try {
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
        assert(
          item._et === 'Subscription',
          () =>
            new DataIntegrityError(
              `Query result included at item with type ${item._et}. Only Subscription was expected.`
            )
        );
        return unmarshallSubscription(item);
      }),
      nextToken: lastEvaluatedKey,
    };
  } catch (err) {
    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

/** queries the Subscription table by primary key using a node id */
export async function querySubscriptionByNodeId(
  id: Scalars['ID']
): Promise<Readonly<Omit<ResultType<Subscription>, 'metrics'>>> {
  const primaryKeyValues = Base64.decode(id)
    .split(':')
    .slice(1)
    .join(':')
    .split('#');

  const primaryKey: QuerySubscriptionInput = {
    vendor: primaryKeyValues[1] as Vendor,
    externalId: primaryKeyValues[2],
  };

  if (typeof primaryKeyValues[2] !== 'undefined') {
    // @ts-ignore - TSC will usually see this as an error because it determined
    // that primaryKey is the no-sort-fields-specified version of the type.
    primaryKey.effectiveDate = new Date(primaryKeyValues[5]);
  }

  const {capacity, items} = await querySubscription(primaryKey);

  assert(items.length > 0, () => new NotFoundError('Subscription', primaryKey));
  assert(
    items.length < 2,
    () => new DataIntegrityError(`Found multiple Subscription with id ${id}`)
  );

  return {capacity, item: items[0]};
}

export interface MarshallSubscriptionOutput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type MarshallSubscriptionInput = Required<
  Pick<Subscription, 'effectiveDate' | 'externalId' | 'vendor'>
> &
  Partial<
    Pick<Subscription, 'cancelled' | 'onFreeTrial' | 'planName' | 'version'>
  >;

/** Marshalls a DynamoDB record into a Subscription object */
export function marshallSubscription(
  input: MarshallSubscriptionInput,
  now = new Date()
): MarshallSubscriptionOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
    '#effectiveDate = :effectiveDate',
    '#externalId = :externalId',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#effectiveDate': 'effective_date',
    '#externalId': 'external_id',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'Subscription',
    ':effectiveDate':
      input.effectiveDate === null ? null : input.effectiveDate.toISOString(),
    ':externalId': input.externalId,
    ':vendor': input.vendor,
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
  };

  if ('cancelled' in input && typeof input.cancelled !== 'undefined') {
    ean['#cancelled'] = 'cancelled';
    eav[':cancelled'] = input.cancelled;
    updateExpression.push('#cancelled = :cancelled');
  }

  if ('onFreeTrial' in input && typeof input.onFreeTrial !== 'undefined') {
    ean['#onFreeTrial'] = 'on_free_trial';
    eav[':onFreeTrial'] = input.onFreeTrial;
    updateExpression.push('#onFreeTrial = :onFreeTrial');
  }

  if ('planName' in input && typeof input.planName !== 'undefined') {
    ean['#planName'] = 'plan_name';
    eav[':planName'] = input.planName;
    updateExpression.push('#planName = :planName');
  }
  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
  };
}

/** Unmarshalls a DynamoDB record into a Subscription object */
export function unmarshallSubscription(
  item: Record<string, any>
): Subscription {
  let result: Subscription = {
    createdAt: unmarshallRequiredField(
      item,
      'createdAt',
      ['_ct'],
      (v) => new Date(v)
    ),
    effectiveDate: unmarshallRequiredField(
      item,
      'effectiveDate',
      ['effective_date', 'effectiveDate'],
      (v) => new Date(v)
    ),
    externalId: unmarshallRequiredField(item, 'externalId', [
      'external_id',
      'externalId',
    ]),
    id: Base64.encode(`Subscription:${item.pk}#:#${item.sk}`),
    updatedAt: unmarshallRequiredField(
      item,
      'updatedAt',
      ['_md'],
      (v) => new Date(v)
    ),
    vendor: unmarshallRequiredField(item, 'vendor', ['vendor', 'vendor']),
    version: unmarshallRequiredField(item, 'version', ['_v']),
  };

  if ('cancelled' in item || 'cancelled' in item) {
    result = {
      ...result,
      cancelled: unmarshallOptionalField(item, 'cancelled', [
        'cancelled',
        'cancelled',
      ]),
    };
  }
  if ('on_free_trial' in item || 'onFreeTrial' in item) {
    result = {
      ...result,
      onFreeTrial: unmarshallOptionalField(item, 'onFreeTrial', [
        'on_free_trial',
        'onFreeTrial',
      ]),
    };
  }
  if ('plan_name' in item || 'planName' in item) {
    result = {
      ...result,
      planName: unmarshallOptionalField(item, 'planName', [
        'plan_name',
        'planName',
      ]),
    };
  }

  return result;
}
