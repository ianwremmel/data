import type {
  ConsumedCapacity,
  ItemCollectionMetrics,
} from '@aws-sdk/client-dynamodb';
import {ConditionalCheckFailedException} from '@aws-sdk/client-dynamodb';
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
  const tableName = process.env.TABLE_ACCOUNT;
  assert(tableName, 'TABLE_ACCOUNT is not set');

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallAccount(input, now);

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
    Key: {pk: `ACCOUNT#${input.vendor}#${input.externalId}`, sk: `SUMMARY`},
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
  const tableName = process.env.TABLE_ACCOUNT;
  assert(tableName, 'TABLE_ACCOUNT is not set');
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
    Key: {pk: `ACCOUNT#${input.vendor}#${input.externalId}`, sk: `SUMMARY`},
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
  const tableName = process.env.TABLE_ACCOUNT;
  assert(tableName, 'TABLE_ACCOUNT is not set');

  try {
    const commandInput: DeleteCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      Key: {pk: `ACCOUNT#${input.vendor}#${input.externalId}`, sk: `SUMMARY`},
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
  const tableName = process.env.TABLE_ACCOUNT;
  assert(tableName, 'TABLE_ACCOUNT is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: false,
    Key: {pk: `ACCOUNT#${input.vendor}#${input.externalId}`, sk: `SUMMARY`},
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
  const tableName = process.env.TABLE_ACCOUNT;
  assert(tableName, 'TABLE_ACCOUNT is not set');
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
      Key: {pk: `ACCOUNT#${input.vendor}#${input.externalId}`, sk: `SUMMARY`},
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
  const tableName = process.env.TABLE_ACCOUNT;
  assert(tableName, 'TABLE_ACCOUNT is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallAccount(input);
  try {
    const commandInput: UpdateCommandInput = {
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
        ':pk': `ACCOUNT#${input.vendor}#${input.externalId}`,
        ':sk': ['INSTANCE', 'createdAt' in input && input.createdAt]
          .filter(Boolean)
          .join('#'),
      };
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {
      ':pk': `ACCOUNT#${input.vendor}#${input.externalId}`,
      ':sk': ['SUMMARY'].filter(Boolean).join('#'),
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
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryAccountOutput>> {
  const tableName = process.env.TABLE_ACCOUNT;
  assert(tableName, 'TABLE_ACCOUNT is not set');

  const ExpressionAttributeNames = makeEanForQueryAccount(input);
  const ExpressionAttributeValues = makeEavForQueryAccount(input);
  const KeyConditionExpression = makeKceForQueryAccount(input, {operator});

  const commandInput: QueryCommandInput = {
    ConsistentRead: false,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    IndexName: 'index' in input ? input.index : undefined,
    KeyConditionExpression,
    Limit: limit,
    ReturnConsumedCapacity: 'INDEXES',
    ScanIndexForward: !reverse,
    TableName: tableName,
  };

  const {ConsumedCapacity: capacity, Items: items = []} =
    await ddbDocClient.send(new QueryCommand(commandInput));

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
    '#lsi1sk = :lsi1sk',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
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
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
    ':lsi1sk': `INSTANCE#input.createdAt.getTime()`,
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
  assert(
    item._ct !== null,
    () => new DataIntegrityError('Expected createdAt to be non-null')
  );
  assert(
    typeof item._ct !== 'undefined',
    () => new DataIntegrityError('Expected createdAt to be defined')
  );

  assert(
    item.effective_date !== null,
    () => new DataIntegrityError('Expected effectiveDate to be non-null')
  );
  assert(
    typeof item.effective_date !== 'undefined',
    () => new DataIntegrityError('Expected effectiveDate to be defined')
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
  const tableName = process.env.TABLE_SUBSCRIPTION;
  assert(tableName, 'TABLE_SUBSCRIPTION is not set');

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSubscription(input, now);

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
      pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
      sk: `SUBSCRIPTION#${input.effectiveDate.getTime()}`,
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
  const tableName = process.env.TABLE_SUBSCRIPTION;
  assert(tableName, 'TABLE_SUBSCRIPTION is not set');
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
      pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
      sk: `SUBSCRIPTION#${input.effectiveDate.getTime()}`,
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
  const tableName = process.env.TABLE_SUBSCRIPTION;
  assert(tableName, 'TABLE_SUBSCRIPTION is not set');

  try {
    const commandInput: DeleteCommandInput = {
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
  const tableName = process.env.TABLE_SUBSCRIPTION;
  assert(tableName, 'TABLE_SUBSCRIPTION is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: false,
    Key: {
      pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
      sk: `SUBSCRIPTION#${input.effectiveDate.getTime()}`,
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
  const tableName = process.env.TABLE_SUBSCRIPTION;
  assert(tableName, 'TABLE_SUBSCRIPTION is not set');
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
        pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
        sk: `SUBSCRIPTION#${input.effectiveDate.getTime()}`,
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
  const tableName = process.env.TABLE_SUBSCRIPTION;
  assert(tableName, 'TABLE_SUBSCRIPTION is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallSubscription(input);
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
        pk: `ACCOUNT#${input.vendor}#${input.externalId}`,
        sk: `SUBSCRIPTION#${input.effectiveDate.getTime()}`,
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
      ':pk': `ACCOUNT#${input.vendor}#${input.externalId}`,
      ':sk': ['SUBSCRIPTION', 'effectiveDate' in input && input.effectiveDate]
        .filter(Boolean)
        .join('#'),
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
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QuerySubscriptionOutput>> {
  const tableName = process.env.TABLE_SUBSCRIPTION;
  assert(tableName, 'TABLE_SUBSCRIPTION is not set');

  const ExpressionAttributeNames = makeEanForQuerySubscription(input);
  const ExpressionAttributeValues = makeEavForQuerySubscription(input);
  const KeyConditionExpression = makeKceForQuerySubscription(input, {operator});

  const commandInput: QueryCommandInput = {
    ConsistentRead: false,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    IndexName: undefined,
    KeyConditionExpression,
    Limit: limit,
    ReturnConsumedCapacity: 'INDEXES',
    ScanIndexForward: !reverse,
    TableName: tableName,
  };

  const {ConsumedCapacity: capacity, Items: items = []} =
    await ddbDocClient.send(new QueryCommand(commandInput));

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
    ':effectiveDate': input.effectiveDate.getTime(),
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
  assert(
    item._ct !== null,
    () => new DataIntegrityError('Expected createdAt to be non-null')
  );
  assert(
    typeof item._ct !== 'undefined',
    () => new DataIntegrityError('Expected createdAt to be defined')
  );

  assert(
    item.effective_date !== null,
    () => new DataIntegrityError('Expected effectiveDate to be non-null')
  );
  assert(
    typeof item.effective_date !== 'undefined',
    () => new DataIntegrityError('Expected effectiveDate to be defined')
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
