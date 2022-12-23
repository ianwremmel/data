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

/** An object to track a user's logins */
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

/** The Query type */
export interface Query {
  __typename?: 'Query';
  node?: Maybe<Node>;
}

/** The Query type */
export interface QueryNodeArgs {
  id: Scalars['ID'];
}

export type ScheduledEmail = Model &
  Timestamped &
  Versioned & {
    __typename?: 'ScheduledEmail';
    createdAt: Scalars['Date'];
    expires?: Maybe<Scalars['Date']>;
    externalId: Scalars['String'];
    id: Scalars['ID'];
    template: Scalars['String'];
    updatedAt: Scalars['Date'];
    vendor: Vendor;
    version: Scalars['Int'];
  };

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

/** An object to track a user's logins */
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

export interface ResultType<T> {
  capacity: ConsumedCapacity;
  item: T;
  metrics: ItemCollectionMetrics | undefined;
}

export interface MultiResultType<T> {
  capacity: ConsumedCapacity;
  items: T[];
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
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallAccount(input);
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
      Key: {pk: `ACCOUNT#${input.vendor}#${input.externalId}`, sk: `SUMMARY`},
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
}

export type BlindWriteAccountInput = Omit<
  Account,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type BlindWriteAccountOutput = ResultType<Account>;
/** */
export async function blindWriteAccount(
  input: Readonly<BlindWriteAccountInput>
): Promise<Readonly<BlindWriteAccountOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallAccount(input);

  delete ExpressionAttributeNames['#pk'];
  delete ExpressionAttributeValues[':version'];

  const eav = {...ExpressionAttributeValues, ':one': 1};
  const ue = `${UpdateExpression.split(', ')
    .filter((e) => !e.startsWith('#version'))
    .join(', ')} ADD #version :one`;

  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
    new UpdateCommand({
      ExpressionAttributeNames,
      ExpressionAttributeValues: eav,
      Key: {pk: `ACCOUNT#${input.vendor}#${input.externalId}`, sk: `SUMMARY`},
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: ue,
    })
  );

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
}

export type DeleteAccountOutput = ResultType<void>;

/**  */
export async function deleteAccount(
  input: AccountPrimaryKey
): Promise<DeleteAccountOutput> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(
        new DeleteCommand({
          ConditionExpression: 'attribute_exists(#pk)',
          ExpressionAttributeNames: {
            '#pk': 'pk',
          },
          Key: {
            pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
            sk: `SUMMARY`,
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
      throw new NotFoundError('Account', input);
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

  const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
    new GetCommand({
      ConsistentRead: false,
      Key: {pk: `ACCOUNT#${input.vendor}#${input.externalId}`, sk: `SUMMARY`},
      ReturnConsumedCapacity: 'INDEXES',
      TableName: tableName,
    })
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
}

export type TouchAccountOutput = ResultType<void>;

/**  */
export async function touchAccount(
  input: AccountPrimaryKey
): Promise<TouchAccountOutput> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');
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
            pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
            sk: `SUMMARY`,
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
      throw new NotFoundError('Account', input);
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
        Key: {pk: `ACCOUNT#${input.vendor}#${input.externalId}`, sk: `SUMMARY`},
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
function makePartitionKeyForQueryAccount(input: QueryAccountInput): string {
  if (!('index' in input)) {
    return `ACCOUNT#${input.vendor}#${input.externalId}`;
  } else if ('index' in input && input.index === 'lsi1') {
    return `ACCOUNT#${input.vendor}#${input.externalId}`;
  }

  throw new Error('Could not construct partition key from input');
}

/** helper */
function makeSortKeyForQueryAccount(
  input: QueryAccountInput
): string | undefined {
  if ('index' in input) {
    if (input.index === 'lsi1') {
      return ['INSTANCE', 'createdAt' in input && input.createdAt]
        .filter(Boolean)
        .join('#');
    }
  } else {
    return ['SUMMARY'].filter(Boolean).join('#');
  }
}

/** helper */
function makeEavPkForQueryAccount(input: QueryAccountInput): string {
  return 'pk';
}

/** helper */
function makeEavSkForQueryAccount(input: QueryAccountInput): string {
  if ('index' in input) {
    const lsis = ['lsi1'];
    if (lsis.includes(input.index)) {
      return input.index;
    }
  }
  return 'sk';
}

/** queryAccount */
export async function queryAccount(
  input: Readonly<QueryAccountInput>,
  {
    limit = undefined,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryAccountOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  const {ConsumedCapacity: capacity, Items: items = []} =
    await ddbDocClient.send(
      new QueryCommand({
        ConsistentRead: false,
        ExpressionAttributeNames: {
          '#pk': makeEavPkForQueryAccount(input),
          '#sk': makeEavSkForQueryAccount(input),
        },
        ExpressionAttributeValues: {
          ':pk': makePartitionKeyForQueryAccount(input),
          ':sk': makeSortKeyForQueryAccount(input),
        },
        IndexName: 'index' in input ? input.index : undefined,
        KeyConditionExpression: `#pk = :pk AND ${
          operator === 'begins_with'
            ? 'begins_with(#sk, :sk)'
            : `#sk ${operator} :sk`
        }`,
        Limit: limit,
        ReturnConsumedCapacity: 'INDEXES',
        ScanIndexForward: !reverse,
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
      assert(item._et === 'Account', () => new DataIntegrityError('TODO'));
      return unmarshallAccount(item);
    }),
  };
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
  input: MarshallAccountInput
): MarshallAccountOutput {
  const now = new Date();

  const updateExpression: string[] = [
    '#entity = :entity',
    '#createdAt = :createdAt',
    '#effectiveDate = :effectiveDate',
    '#externalId = :externalId',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
    '#lsi1sk = :lsi1sk',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#createdAt': '_ct',
    '#effectiveDate': 'effective_date',
    '#externalId': 'external_id',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
    '#lsi1sk': 'lsi1sk',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'Account',
    ':effectiveDate': input.effectiveDate.getTime(),
    ':externalId': input.externalId,
    ':vendor': input.vendor,
    ':createdAt': now.getTime(),
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
    ':lsi1sk': `INSTANCE#${now.getTime()}`,
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
  if ('effective_date' in item) {
    assert(
      item.effective_date !== null,
      () => new DataIntegrityError('Expected effectiveDate to be non-null')
    );
    assert(
      typeof item.effective_date !== 'undefined',
      () => new DataIntegrityError('Expected effectiveDate to be defined')
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

  let result: Account = {
    createdAt: new Date(item._ct),
    effectiveDate: new Date(item.effective_date),
    externalId: item.external_id,
    id: Base64.encode(`Account:${item.pk}#:#${item.sk}`),
    updatedAt: new Date(item._md),
    vendor: item.vendor,
    version: item._v,
  };

  if ('cancelled' in item) {
    result = {
      ...result,
      cancelled: item.cancelled,
    };
  }

  if ('on_free_trial' in item) {
    result = {
      ...result,
      onFreeTrial: item.on_free_trial,
    };
  }

  if ('plan_name' in item) {
    result = {
      ...result,
      planName: item.plan_name,
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
  'createdAt' | 'expires' | 'id' | 'updatedAt' | 'version'
> &
  Partial<Pick<ScheduledEmail, 'expires'>>;
export type CreateScheduledEmailOutput = ResultType<ScheduledEmail>;
/**  */
export async function createScheduledEmail(
  input: Readonly<CreateScheduledEmailInput>
): Promise<Readonly<CreateScheduledEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallScheduledEmail(input);
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
        pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
        sk: `SCHEDULED_EMAIL#${input.template}`,
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
}

export type BlindWriteScheduledEmailInput = Omit<
  ScheduledEmail,
  'createdAt' | 'expires' | 'id' | 'updatedAt' | 'version'
> &
  Partial<Pick<ScheduledEmail, 'expires'>>;
export type BlindWriteScheduledEmailOutput = ResultType<ScheduledEmail>;
/** */
export async function blindWriteScheduledEmail(
  input: Readonly<BlindWriteScheduledEmailInput>
): Promise<Readonly<BlindWriteScheduledEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallScheduledEmail(input);

  delete ExpressionAttributeNames['#pk'];
  delete ExpressionAttributeValues[':version'];

  const eav = {...ExpressionAttributeValues, ':one': 1};
  const ue = `${UpdateExpression.split(', ')
    .filter((e) => !e.startsWith('#version'))
    .join(', ')} ADD #version :one`;

  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
    new UpdateCommand({
      ExpressionAttributeNames,
      ExpressionAttributeValues: eav,
      Key: {
        pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
        sk: `SCHEDULED_EMAIL#${input.template}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: ue,
    })
  );

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
}

export type DeleteScheduledEmailOutput = ResultType<void>;

/**  */
export async function deleteScheduledEmail(
  input: ScheduledEmailPrimaryKey
): Promise<DeleteScheduledEmailOutput> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(
        new DeleteCommand({
          ConditionExpression: 'attribute_exists(#pk)',
          ExpressionAttributeNames: {
            '#pk': 'pk',
          },
          Key: {
            pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
            sk: `SCHEDULED_EMAIL#${input.template}`,
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
      throw new NotFoundError('ScheduledEmail', input);
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

  const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
    new GetCommand({
      ConsistentRead: false,
      Key: {
        pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
        sk: `SCHEDULED_EMAIL#${input.template}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      TableName: tableName,
    })
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
}

export type TouchScheduledEmailOutput = ResultType<void>;

/**  */
export async function touchScheduledEmail(
  input: ScheduledEmailPrimaryKey
): Promise<TouchScheduledEmailOutput> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');
  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(
        new UpdateCommand({
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
          Key: {
            pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
            sk: `SCHEDULED_EMAIL#${input.template}`,
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
      throw new NotFoundError('ScheduledEmail', input);
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type UpdateScheduledEmailInput = Omit<
  ScheduledEmail,
  'createdAt' | 'expires' | 'id' | 'updatedAt'
> &
  Partial<Pick<ScheduledEmail, 'expires'>>;
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
          pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
          sk: `SCHEDULED_EMAIL#${input.template}`,
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
function makePartitionKeyForQueryScheduledEmail(
  input: QueryScheduledEmailInput
): string {
  if (!('index' in input)) {
    return `ACCOUNT#${input.vendor}#${input.externalId}`;
  }

  throw new Error('Could not construct partition key from input');
}

/** helper */
function makeSortKeyForQueryScheduledEmail(
  input: QueryScheduledEmailInput
): string | undefined {
  return ['SCHEDULED_EMAIL', 'template' in input && input.template]
    .filter(Boolean)
    .join('#');
}

/** helper */
function makeEavPkForQueryScheduledEmail(
  input: QueryScheduledEmailInput
): string {
  return 'pk';
}

/** helper */
function makeEavSkForQueryScheduledEmail(
  input: QueryScheduledEmailInput
): string {
  return 'sk';
}

/** queryScheduledEmail */
export async function queryScheduledEmail(
  input: Readonly<QueryScheduledEmailInput>,
  {
    limit = undefined,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryScheduledEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  const {ConsumedCapacity: capacity, Items: items = []} =
    await ddbDocClient.send(
      new QueryCommand({
        ConsistentRead: false,
        ExpressionAttributeNames: {
          '#pk': makeEavPkForQueryScheduledEmail(input),
          '#sk': makeEavSkForQueryScheduledEmail(input),
        },
        ExpressionAttributeValues: {
          ':pk': makePartitionKeyForQueryScheduledEmail(input),
          ':sk': makeSortKeyForQueryScheduledEmail(input),
        },
        IndexName: undefined,
        KeyConditionExpression: `#pk = :pk AND ${
          operator === 'begins_with'
            ? 'begins_with(#sk, :sk)'
            : `#sk ${operator} :sk`
        }`,
        Limit: limit,
        ReturnConsumedCapacity: 'INDEXES',
        ScanIndexForward: !reverse,
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
      assert(
        item._et === 'ScheduledEmail',
        () => new DataIntegrityError('TODO')
      );
      return unmarshallScheduledEmail(item);
    }),
  };
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
  Partial<Pick<ScheduledEmail, 'expires' | 'version'>>;

/** Marshalls a DynamoDB record into a ScheduledEmail object */
export function marshallScheduledEmail(
  input: MarshallScheduledEmailInput
): MarshallScheduledEmailOutput {
  const now = new Date();

  const updateExpression: string[] = [
    '#entity = :entity',
    '#createdAt = :createdAt',
    '#externalId = :externalId',
    '#template = :template',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#createdAt': '_ct',
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
    ':createdAt': now.getTime(),
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
  };

  if ('expires' in input && typeof input.expires !== 'undefined') {
    assert(
      !Number.isNaN(input.expires?.getTime()),
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

/** Unmarshalls a DynamoDB record into a ScheduledEmail object */
export function unmarshallScheduledEmail(
  item: Record<string, any>
): ScheduledEmail {
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
  if ('template' in item) {
    assert(
      item.template !== null,
      () => new DataIntegrityError('Expected template to be non-null')
    );
    assert(
      typeof item.template !== 'undefined',
      () => new DataIntegrityError('Expected template to be defined')
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

  let result: ScheduledEmail = {
    createdAt: new Date(item._ct),
    externalId: item.external_id,
    id: Base64.encode(`ScheduledEmail:${item.pk}#:#${item.sk}`),
    template: item.template,
    updatedAt: new Date(item._md),
    vendor: item.vendor,
    version: item._v,
  };

  if ('ttl' in item) {
    result = {
      ...result,
      expires: item.ttl ? new Date(item.ttl) : null,
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
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSentEmail(input);
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
        pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
        sk: `TEMPLATE#${input.template}#${now.getTime()}`,
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
}

export type BlindWriteSentEmailInput = Omit<
  SentEmail,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type BlindWriteSentEmailOutput = ResultType<SentEmail>;
/** */
export async function blindWriteSentEmail(
  input: Readonly<BlindWriteSentEmailInput>
): Promise<Readonly<BlindWriteSentEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSentEmail(input);

  delete ExpressionAttributeNames['#pk'];
  delete ExpressionAttributeValues[':version'];

  const eav = {...ExpressionAttributeValues, ':one': 1};
  const ue = `${UpdateExpression.split(', ')
    .filter((e) => !e.startsWith('#version'))
    .join(', ')} ADD #version :one`;

  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
    new UpdateCommand({
      ExpressionAttributeNames,
      ExpressionAttributeValues: eav,
      Key: {
        pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
        sk: `TEMPLATE#${input.template}#${now.getTime()}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: ue,
    })
  );

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
}

export type DeleteSentEmailOutput = ResultType<void>;

/**  */
export async function deleteSentEmail(
  input: SentEmailPrimaryKey
): Promise<DeleteSentEmailOutput> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(
        new DeleteCommand({
          ConditionExpression: 'attribute_exists(#pk)',
          ExpressionAttributeNames: {
            '#pk': 'pk',
          },
          Key: {
            pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
            sk: `TEMPLATE#${input.template}#${now.getTime()}`,
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
      throw new NotFoundError('SentEmail', input);
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

  const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
    new GetCommand({
      ConsistentRead: false,
      Key: {
        pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
        sk: `TEMPLATE#${input.template}#${now.getTime()}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      TableName: tableName,
    })
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
}

export type TouchSentEmailOutput = ResultType<void>;

/**  */
export async function touchSentEmail(
  input: SentEmailPrimaryKey
): Promise<TouchSentEmailOutput> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');
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
            pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
            sk: `TEMPLATE#${input.template}#${now.getTime()}`,
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
      throw new NotFoundError('SentEmail', input);
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type UpdateSentEmailInput = Omit<
  SentEmail,
  'createdAt' | 'id' | 'updatedAt'
>;
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
          pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
          sk: `TEMPLATE#${input.template}#${now.getTime()}`,
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
function makePartitionKeyForQuerySentEmail(input: QuerySentEmailInput): string {
  if (!('index' in input)) {
    return `ACCOUNT#${input.vendor}#${input.externalId}`;
  }

  throw new Error('Could not construct partition key from input');
}

/** helper */
function makeSortKeyForQuerySentEmail(
  input: QuerySentEmailInput
): string | undefined {
  return [
    'TEMPLATE',
    'template' in input && input.template,
    'createdAt' in input && input.createdAt,
  ]
    .filter(Boolean)
    .join('#');
}

/** helper */
function makeEavPkForQuerySentEmail(input: QuerySentEmailInput): string {
  return 'pk';
}

/** helper */
function makeEavSkForQuerySentEmail(input: QuerySentEmailInput): string {
  return 'sk';
}

/** querySentEmail */
export async function querySentEmail(
  input: Readonly<QuerySentEmailInput>,
  {
    limit = undefined,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QuerySentEmailOutput>> {
  const tableName = process.env.TABLE_EMAIL;
  assert(tableName, 'TABLE_EMAIL is not set');

  const {ConsumedCapacity: capacity, Items: items = []} =
    await ddbDocClient.send(
      new QueryCommand({
        ConsistentRead: false,
        ExpressionAttributeNames: {
          '#pk': makeEavPkForQuerySentEmail(input),
          '#sk': makeEavSkForQuerySentEmail(input),
        },
        ExpressionAttributeValues: {
          ':pk': makePartitionKeyForQuerySentEmail(input),
          ':sk': makeSortKeyForQuerySentEmail(input),
        },
        IndexName: undefined,
        KeyConditionExpression: `#pk = :pk AND ${
          operator === 'begins_with'
            ? 'begins_with(#sk, :sk)'
            : `#sk ${operator} :sk`
        }`,
        Limit: limit,
        ReturnConsumedCapacity: 'INDEXES',
        ScanIndexForward: !reverse,
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
      assert(item._et === 'SentEmail', () => new DataIntegrityError('TODO'));
      return unmarshallSentEmail(item);
    }),
  };
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
  input: MarshallSentEmailInput
): MarshallSentEmailOutput {
  const now = new Date();

  const updateExpression: string[] = [
    '#entity = :entity',
    '#createdAt = :createdAt',
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
    '#createdAt': '_ct',
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
    ':createdAt': now.getTime(),
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
  if ('message_id' in item) {
    assert(
      item.message_id !== null,
      () => new DataIntegrityError('Expected messageId to be non-null')
    );
    assert(
      typeof item.message_id !== 'undefined',
      () => new DataIntegrityError('Expected messageId to be defined')
    );
  }
  if ('template' in item) {
    assert(
      item.template !== null,
      () => new DataIntegrityError('Expected template to be non-null')
    );
    assert(
      typeof item.template !== 'undefined',
      () => new DataIntegrityError('Expected template to be defined')
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

  const result: SentEmail = {
    createdAt: new Date(item._ct),
    externalId: item.external_id,
    id: Base64.encode(`SentEmail:${item.pk}#:#${item.sk}`),
    messageId: item.message_id,
    template: item.template,
    updatedAt: new Date(item._md),
    vendor: item.vendor,
    version: item._v,
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
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSubscription(input);
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
        pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
        sk: `SUBSCRIPTION#${input.effectiveDate.getTime()}`,
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
}

export type BlindWriteSubscriptionInput = Omit<
  Subscription,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type BlindWriteSubscriptionOutput = ResultType<Subscription>;
/** */
export async function blindWriteSubscription(
  input: Readonly<BlindWriteSubscriptionInput>
): Promise<Readonly<BlindWriteSubscriptionOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSubscription(input);

  delete ExpressionAttributeNames['#pk'];
  delete ExpressionAttributeValues[':version'];

  const eav = {...ExpressionAttributeValues, ':one': 1};
  const ue = `${UpdateExpression.split(', ')
    .filter((e) => !e.startsWith('#version'))
    .join(', ')} ADD #version :one`;

  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
    new UpdateCommand({
      ExpressionAttributeNames,
      ExpressionAttributeValues: eav,
      Key: {
        pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
        sk: `SUBSCRIPTION#${input.effectiveDate.getTime()}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: ue,
    })
  );

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
}

export type DeleteSubscriptionOutput = ResultType<void>;

/**  */
export async function deleteSubscription(
  input: SubscriptionPrimaryKey
): Promise<DeleteSubscriptionOutput> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(
        new DeleteCommand({
          ConditionExpression: 'attribute_exists(#pk)',
          ExpressionAttributeNames: {
            '#pk': 'pk',
          },
          Key: {
            pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
            sk: `SUBSCRIPTION#${input.effectiveDate.getTime()}`,
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
      throw new NotFoundError('Subscription', input);
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

  const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
    new GetCommand({
      ConsistentRead: false,
      Key: {
        pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
        sk: `SUBSCRIPTION#${input.effectiveDate.getTime()}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      TableName: tableName,
    })
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
        `Expected ${JSON.stringify(input)} to load a Subscription but loaded ${
          item._et
        } instead`
      )
  );

  return {
    capacity,
    item: unmarshallSubscription(item),
    metrics: undefined,
  };
}

export type TouchSubscriptionOutput = ResultType<void>;

/**  */
export async function touchSubscription(
  input: SubscriptionPrimaryKey
): Promise<TouchSubscriptionOutput> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');
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
            pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
            sk: `SUBSCRIPTION#${input.effectiveDate.getTime()}`,
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
      throw new NotFoundError('Subscription', input);
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
          pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
          sk: `SUBSCRIPTION#${input.effectiveDate.getTime()}`,
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
function makePartitionKeyForQuerySubscription(
  input: QuerySubscriptionInput
): string {
  if (!('index' in input)) {
    return `ACCOUNT#${input.vendor}#${input.externalId}`;
  }

  throw new Error('Could not construct partition key from input');
}

/** helper */
function makeSortKeyForQuerySubscription(
  input: QuerySubscriptionInput
): string | undefined {
  return ['SUBSCRIPTION', 'effectiveDate' in input && input.effectiveDate]
    .filter(Boolean)
    .join('#');
}

/** helper */
function makeEavPkForQuerySubscription(input: QuerySubscriptionInput): string {
  return 'pk';
}

/** helper */
function makeEavSkForQuerySubscription(input: QuerySubscriptionInput): string {
  return 'sk';
}

/** querySubscription */
export async function querySubscription(
  input: Readonly<QuerySubscriptionInput>,
  {
    limit = undefined,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QuerySubscriptionOutput>> {
  const tableName = process.env.TABLE_ACCOUNTS;
  assert(tableName, 'TABLE_ACCOUNTS is not set');

  const {ConsumedCapacity: capacity, Items: items = []} =
    await ddbDocClient.send(
      new QueryCommand({
        ConsistentRead: false,
        ExpressionAttributeNames: {
          '#pk': makeEavPkForQuerySubscription(input),
          '#sk': makeEavSkForQuerySubscription(input),
        },
        ExpressionAttributeValues: {
          ':pk': makePartitionKeyForQuerySubscription(input),
          ':sk': makeSortKeyForQuerySubscription(input),
        },
        IndexName: undefined,
        KeyConditionExpression: `#pk = :pk AND ${
          operator === 'begins_with'
            ? 'begins_with(#sk, :sk)'
            : `#sk ${operator} :sk`
        }`,
        Limit: limit,
        ReturnConsumedCapacity: 'INDEXES',
        ScanIndexForward: !reverse,
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
      assert(item._et === 'Subscription', () => new DataIntegrityError('TODO'));
      return unmarshallSubscription(item);
    }),
  };
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
  input: MarshallSubscriptionInput
): MarshallSubscriptionOutput {
  const now = new Date();

  const updateExpression: string[] = [
    '#entity = :entity',
    '#createdAt = :createdAt',
    '#effectiveDate = :effectiveDate',
    '#externalId = :externalId',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#createdAt': '_ct',
    '#effectiveDate': 'effective_date',
    '#externalId': 'external_id',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'Subscription',
    ':effectiveDate': input.effectiveDate.getTime(),
    ':externalId': input.externalId,
    ':vendor': input.vendor,
    ':createdAt': now.getTime(),
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
  if ('effective_date' in item) {
    assert(
      item.effective_date !== null,
      () => new DataIntegrityError('Expected effectiveDate to be non-null')
    );
    assert(
      typeof item.effective_date !== 'undefined',
      () => new DataIntegrityError('Expected effectiveDate to be defined')
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

  let result: Subscription = {
    createdAt: new Date(item._ct),
    effectiveDate: new Date(item.effective_date),
    externalId: item.external_id,
    id: Base64.encode(`Subscription:${item.pk}#:#${item.sk}`),
    updatedAt: new Date(item._md),
    vendor: item.vendor,
    version: item._v,
  };

  if ('cancelled' in item) {
    result = {
      ...result,
      cancelled: item.cancelled,
    };
  }

  if ('on_free_trial' in item) {
    result = {
      ...result,
      onFreeTrial: item.on_free_trial,
    };
  }

  if ('plan_name' in item) {
    result = {
      ...result,
      planName: item.plan_name,
    };
  }

  return result;
}
