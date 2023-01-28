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
  unmarshallRequiredField,
  unmarshallOptionalField,
  DataIntegrityError,
  NotFoundError,
  OptimisticLockingError,
  UnexpectedAwsError,
  UnexpectedError,
} from '@ianwremmel/data';
import Base64 from 'base64url';

import {ddbDocClient, idGenerator} from '../../dependencies';
import {computeIndexedPlanName, computeField} from '../compute-functions';
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
    hasEverSubscribed: Scalars['Boolean'];
    id: Scalars['ID'];
    indexedPlanName?: Maybe<Scalars['String']>;
    lastPlanName?: Maybe<PlanName>;
    onFreeTrial?: Maybe<Scalars['Boolean']>;
    planName?: Maybe<PlanName>;
    updatedAt: Scalars['Date'];
    vendor: Vendor;
    version: Scalars['Int'];
  };

/** CDC Event Types */
export type CdcEvent = 'INSERT' | 'MODIFY' | 'REMOVE' | 'UPSERT';

/** Possible case types for converting a fieldName to a DyanmoeDB column_name. */
export type ColumnCase = 'CAMEL_CASE' | 'SNAKE_CASE';

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

/** A Repository */
export type Repository = Model &
  PublicModel &
  Timestamped &
  Versioned & {
    __typename?: 'Repository';
    createdAt: Scalars['Date'];
    defaultBranchName?: Maybe<Scalars['String']>;
    externalAccountId: Scalars['String'];
    externalId: Scalars['String'];
    externalInstallationId: Scalars['String'];
    id: Scalars['ID'];
    organization: Scalars['String'];
    private?: Maybe<Scalars['Boolean']>;
    publicId: Scalars['String'];
    repo?: Maybe<Scalars['String']>;
    token: Scalars['String'];
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

/** A user session object. */
export type UserSession = Model &
  Node &
  PublicModel &
  Timestamped &
  Versioned & {
    __typename?: 'UserSession';
    aliasedField?: Maybe<Scalars['String']>;
    computedField?: Maybe<Scalars['String']>;
    createdAt: Scalars['Date'];
    expires?: Maybe<Scalars['Date']>;
    id: Scalars['ID'];
    /**
     * This field has nothing to do with UserSession, but this was the easiest place
     * to add it for testing. The intent is to prove that we can write an object,
     * when an optional field is absent from the payload.
     */
    optionalField?: Maybe<Scalars['String']>;
    publicId: Scalars['String'];
    session: Scalars['JSONObject'];
    /**
     * Since `id` is a reserved field, sessionId is the field we'll use to inject a
     * random uuid, which the underlying system will use as the basis for `id`.
     */
    sessionId: Scalars['String'];
    updatedAt: Scalars['Date'];
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

export interface AccountPrimaryKey {
  externalId: Scalars['String'];
  vendor: Vendor;
}

export type CreateAccountInput = Omit<
  Account,
  'createdAt' | 'id' | 'indexedPlanName' | 'updatedAt' | 'version'
>;
export type CreateAccountOutput = ResultType<Account>;
/**  */
export async function createAccount(
  _input: Readonly<CreateAccountInput>
): Promise<Readonly<CreateAccountOutput>> {
  const tableName = process.env.TABLE_ACCOUNT;
  assert(tableName, 'TABLE_ACCOUNT is not set');

  const now = new Date();

  // This has to be cast because we're adding computed fields on the next
  // lines.
  const input: MarshallAccountInput = {..._input} as MarshallAccountInput;

  let indexedPlanNameComputed = false;
  let indexedPlanNameComputedValue: Account['indexedPlanName'];
  Object.defineProperty(input, 'indexedPlanName', {
    enumerable: true,
    /** getter */
    get() {
      if (!indexedPlanNameComputed) {
        indexedPlanNameComputed = true;
        indexedPlanNameComputedValue = computeIndexedPlanName(this);
      }
      return indexedPlanNameComputedValue;
    },
  });

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
  'createdAt' | 'id' | 'indexedPlanName' | 'updatedAt' | 'version'
> &
  Partial<Pick<Account, 'createdAt'>>;

export type BlindWriteAccountOutput = ResultType<Account>;
/** */
export async function blindWriteAccount(
  _input: Readonly<BlindWriteAccountInput>
): Promise<Readonly<BlindWriteAccountOutput>> {
  const tableName = process.env.TABLE_ACCOUNT;
  assert(tableName, 'TABLE_ACCOUNT is not set');
  const now = new Date();

  // This has to be cast because we're adding computed fields on the next
  // lines.
  const input: MarshallAccountInput = {..._input} as MarshallAccountInput;

  let indexedPlanNameComputed = false;
  let indexedPlanNameComputedValue: Account['indexedPlanName'];
  Object.defineProperty(input, 'indexedPlanName', {
    enumerable: true,
    /** getter */
    get() {
      if (!indexedPlanNameComputed) {
        indexedPlanNameComputed = true;
        indexedPlanNameComputedValue = computeIndexedPlanName(this);
      }
      return indexedPlanNameComputedValue;
    },
  });

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

export type UpdateAccountInput = Omit<
  Account,
  'createdAt' | 'id' | 'indexedPlanName' | 'updatedAt'
>;
export type UpdateAccountOutput = ResultType<Account>;

/**  */
export async function updateAccount(
  _input: Readonly<UpdateAccountInput>
): Promise<Readonly<UpdateAccountOutput>> {
  const tableName = process.env.TABLE_ACCOUNT;
  assert(tableName, 'TABLE_ACCOUNT is not set');

  // This has to be cast because we're adding computed fields on the next
  // lines.
  const input: MarshallAccountInput = {..._input} as MarshallAccountInput;

  let indexedPlanNameComputed = false;
  let indexedPlanNameComputedValue: Account['indexedPlanName'];
  Object.defineProperty(input, 'indexedPlanName', {
    enumerable: true,
    /** getter */
    get() {
      if (!indexedPlanNameComputed) {
        indexedPlanNameComputed = true;
        indexedPlanNameComputedValue = computeIndexedPlanName(this);
      }
      return indexedPlanNameComputedValue;
    },
  });

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
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type QueryAccountInput =
  | {externalId: Scalars['String']; vendor: Vendor}
  | {index: 'gsi1'; hasEverSubscribed: Scalars['Boolean']}
  | {
      index: 'gsi1';
      cancelled?: Maybe<Scalars['Boolean']>;
      hasEverSubscribed: Scalars['Boolean'];
    }
  | {
      index: 'gsi1';
      cancelled?: Maybe<Scalars['Boolean']>;
      hasEverSubscribed: Scalars['Boolean'];
      indexedPlanName?: Maybe<Scalars['String']>;
    };
export type QueryAccountOutput = MultiResultType<Account>;

/** helper */
function makeEanForQueryAccount(
  input: QueryAccountInput
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
function makeEavForQueryAccount(input: QueryAccountInput): Record<string, any> {
  if ('index' in input) {
    if (input.index === 'gsi1') {
      return {
        ':pk': `PLAN#${input.hasEverSubscribed}`,
        ':sk': [
          'PLAN',
          'cancelled' in input && input.cancelled,
          'indexedPlanName' in input && input.indexedPlanName,
        ]
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
  const tableName = process.env.TABLE_ACCOUNT;
  assert(tableName, 'TABLE_ACCOUNT is not set');

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
  Pick<Account, 'effectiveDate' | 'externalId' | 'hasEverSubscribed' | 'vendor'>
> &
  Partial<
    Pick<
      Account,
      | 'cancelled'
      | 'indexedPlanName'
      | 'lastPlanName'
      | 'onFreeTrial'
      | 'planName'
      | 'version'
    >
  >;

/** Marshalls a DynamoDB record into a Account object */
export function marshallAccount(
  input: MarshallAccountInput,
  now = new Date()
): MarshallAccountOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
    '#effectiveDate = :effectiveDate',
    '#externalId = :externalId',
    '#hasEverSubscribed = :hasEverSubscribed',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
    '#gsi1pk = :gsi1pk',
    '#gsi1sk = :gsi1sk',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#effectiveDate': 'effective_date',
    '#externalId': 'external_id',
    '#hasEverSubscribed': 'has_ever_subscribed',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
    '#gsi1pk': 'gsi1pk',
    '#gsi1sk': 'gsi1sk',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'Account',
    ':effectiveDate': input.effectiveDate.toISOString(),
    ':externalId': input.externalId,
    ':hasEverSubscribed': input.hasEverSubscribed,
    ':vendor': input.vendor,
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
    ':gsi1pk': `PLAN#${input.hasEverSubscribed}`,
    ':gsi1sk': `PLAN#${input.cancelled}#${input.indexedPlanName}`,
  };

  if ('cancelled' in input && typeof input.cancelled !== 'undefined') {
    ean['#cancelled'] = 'cancelled';
    eav[':cancelled'] = input.cancelled;
    updateExpression.push('#cancelled = :cancelled');
  }

  if ('lastPlanName' in input && typeof input.lastPlanName !== 'undefined') {
    ean['#lastPlanName'] = 'last_plan_name';
    eav[':lastPlanName'] = input.lastPlanName;
    updateExpression.push('#lastPlanName = :lastPlanName');
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
    hasEverSubscribed: unmarshallRequiredField(item, 'hasEverSubscribed', [
      'has_ever_subscribed',
      'hasEverSubscribed',
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
  if ('last_plan_name' in item || 'lastPlanName' in item) {
    result = {
      ...result,
      lastPlanName: unmarshallOptionalField(item, 'lastPlanName', [
        'last_plan_name',
        'lastPlanName',
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

  let indexedPlanNameComputed = false;
  const indexedPlanNameDatabaseValue = unmarshallOptionalField(
    item,
    'indexedPlanName',
    ['indexed_plan_name', 'indexedPlanName']
  );
  let indexedPlanNameComputedValue: Account['indexedPlanName'];
  Object.defineProperty(result, 'indexedPlanName', {
    enumerable: true,
    /** getter */
    get() {
      if (!indexedPlanNameComputed) {
        indexedPlanNameComputed = true;
        if (typeof indexedPlanNameDatabaseValue !== 'undefined') {
          indexedPlanNameComputedValue = indexedPlanNameDatabaseValue;
        } else {
          indexedPlanNameComputedValue = computeIndexedPlanName(this);
        }
      }
      return indexedPlanNameComputedValue;
    },
  });

  return result;
}

export interface RepositoryPrimaryKey {
  externalId: Scalars['String'];
  vendor: Vendor;
}

export type CreateRepositoryInput = Omit<
  Repository,
  'createdAt' | 'id' | 'publicId' | 'updatedAt' | 'version'
>;
export type CreateRepositoryOutput = ResultType<Repository>;
/**  */
export async function createRepository(
  input: Readonly<CreateRepositoryInput>
): Promise<Readonly<CreateRepositoryOutput>> {
  const tableName = process.env.TABLE_APPLICATION_DATA;
  assert(tableName, 'TABLE_APPLICATION_DATA is not set');

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallRepository(input, now);

  const publicId = idGenerator();
  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const commandInput: UpdateCommandInput = {
    ConditionExpression: 'attribute_not_exists(#pk)',
    ExpressionAttributeNames: {
      ...ExpressionAttributeNames,
      '#createdAt': '_ct',
      '#publicId': 'publicId',
    },
    ExpressionAttributeValues: {
      ...ExpressionAttributeValues,
      ':createdAt': now.getTime(),
      ':publicId': publicId,
    },
    Key: {
      pk: `REPOSITORY#${input.vendor}#${input.externalId}`,
      sk: `REPOSITORY`,
    },
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'ALL_NEW',
    TableName: tableName,
    UpdateExpression: [
      ...UpdateExpression.split(', '),
      '#createdAt = :createdAt',
      '#publicId = :publicId',
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
    item._et === 'Repository',
    () =>
      new DataIntegrityError(
        `Expected to write Repository but wrote ${item?._et} instead`
      )
  );

  return {
    capacity,
    item: unmarshallRepository(item),
    metrics,
  };
}

export type BlindWriteRepositoryInput = Omit<
  Repository,
  'createdAt' | 'id' | 'publicId' | 'updatedAt' | 'version'
> &
  Partial<Pick<Repository, 'createdAt'>>;

export type BlindWriteRepositoryOutput = ResultType<Repository>;
/** */
export async function blindWriteRepository(
  input: Readonly<BlindWriteRepositoryInput>
): Promise<Readonly<BlindWriteRepositoryOutput>> {
  const tableName = process.env.TABLE_APPLICATION_DATA;
  assert(tableName, 'TABLE_APPLICATION_DATA is not set');
  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallRepository(input, now);

  delete ExpressionAttributeNames['#pk'];
  delete ExpressionAttributeValues[':version'];

  const ean = {
    ...ExpressionAttributeNames,
    '#createdAt': '_ct',
    '#publicId': 'publicId',
  };
  const eav = {
    ...ExpressionAttributeValues,
    ':one': 1,
    ':createdAt': now.getTime(),
    ':publicId': idGenerator(),
  };
  const ue = `${[
    ...UpdateExpression.split(', ').filter((e) => !e.startsWith('#version')),
    '#createdAt = if_not_exists(#createdAt, :createdAt)',
    '#publicId = if_not_exists(#publicId, :publicId)',
  ].join(', ')} ADD #version :one`;

  const commandInput: UpdateCommandInput = {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    Key: {
      pk: `REPOSITORY#${input.vendor}#${input.externalId}`,
      sk: `REPOSITORY`,
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
    item._et === 'Repository',
    () =>
      new DataIntegrityError(
        `Expected to write Repository but wrote ${item?._et} instead`
      )
  );

  return {
    capacity,
    item: unmarshallRepository(item),
    metrics,
  };
}

export type DeleteRepositoryOutput = ResultType<void>;

/**  */
export async function deleteRepository(
  input: RepositoryPrimaryKey
): Promise<DeleteRepositoryOutput> {
  const tableName = process.env.TABLE_APPLICATION_DATA;
  assert(tableName, 'TABLE_APPLICATION_DATA is not set');

  try {
    const commandInput: DeleteCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      Key: {
        pk: `REPOSITORY#${input.vendor}#${input.externalId}`,
        sk: `REPOSITORY`,
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
      throw new NotFoundError('Repository', input);
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type ReadRepositoryOutput = ResultType<Repository>;

/**  */
export async function readRepository(
  input: RepositoryPrimaryKey
): Promise<Readonly<ReadRepositoryOutput>> {
  const tableName = process.env.TABLE_APPLICATION_DATA;
  assert(tableName, 'TABLE_APPLICATION_DATA is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: false,
    Key: {
      pk: `REPOSITORY#${input.vendor}#${input.externalId}`,
      sk: `REPOSITORY`,
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

  assert(item, () => new NotFoundError('Repository', input));
  assert(
    item._et === 'Repository',
    () =>
      new DataIntegrityError(
        `Expected ${JSON.stringify(input)} to load a Repository but loaded ${
          item._et
        } instead`
      )
  );

  return {
    capacity,
    item: unmarshallRepository(item),
    metrics: undefined,
  };
}

export type UpdateRepositoryInput = Omit<
  Repository,
  'createdAt' | 'id' | 'publicId' | 'updatedAt'
>;
export type UpdateRepositoryOutput = ResultType<Repository>;

/**  */
export async function updateRepository(
  input: Readonly<UpdateRepositoryInput>
): Promise<Readonly<UpdateRepositoryOutput>> {
  const tableName = process.env.TABLE_APPLICATION_DATA;
  assert(tableName, 'TABLE_APPLICATION_DATA is not set');

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallRepository(input);
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
        pk: `REPOSITORY#${input.vendor}#${input.externalId}`,
        sk: `REPOSITORY`,
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
      item._et === 'Repository',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify({
            externalId: input.externalId,
            vendor: input.vendor,
          })} to update a Repository but updated ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallRepository(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        await readRepository(input);
      } catch {
        throw new NotFoundError('Repository', {
          externalId: input.externalId,
          vendor: input.vendor,
        });
      }
      throw new OptimisticLockingError('Repository', {
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

export type QueryRepositoryInput =
  | {externalId: Scalars['String']; vendor: Vendor}
  | {index: 'gsi1'; organization: Scalars['String']; vendor: Vendor}
  | {
      index: 'gsi1';
      organization: Scalars['String'];
      repo?: Maybe<Scalars['String']>;
      vendor: Vendor;
    }
  | {index: 'token'; token: Scalars['String']}
  | {index: 'publicId'; publicId: Scalars['String']};
export type QueryRepositoryOutput = MultiResultType<Repository>;

/** helper */
function makeEanForQueryRepository(
  input: QueryRepositoryInput
): Record<string, string> {
  if ('index' in input) {
    if (input.index === 'gsi1') {
      return {'#pk': 'gsi1pk', '#sk': 'gsi1sk'};
    } else if (input.index === 'token') {
      return {'#pk': 'token'};
    } else if (input.index === 'publicId') {
      return {'#pk': 'publicId'};
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {'#pk': 'pk', '#sk': 'sk'};
  }
}

/** helper */
function makeEavForQueryRepository(
  input: QueryRepositoryInput
): Record<string, any> {
  if ('index' in input) {
    if (input.index === 'gsi1') {
      return {
        ':pk': `REPOSITORY#${input.vendor}#${input.organization}`,
        ':sk': ['REPOSITORY', 'repo' in input && input.repo]
          .filter(Boolean)
          .join('#'),
      };
    } else if (input.index === 'token') {
      return {':pk': `${input.token}`};
    } else if (input.index === 'publicId') {
      return {':pk': `${input.publicId}`};
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {
      ':pk': `REPOSITORY#${input.vendor}#${input.externalId}`,
      ':sk': ['REPOSITORY'].filter(Boolean).join('#'),
    };
  }
}

/** helper */
function makeKceForQueryRepository(
  input: QueryRepositoryInput,
  {operator}: Pick<QueryOptions, 'operator'>
): string {
  if ('index' in input) {
    if (input.index === 'gsi1') {
      return `#pk = :pk AND ${
        operator === 'begins_with'
          ? 'begins_with(#sk, :sk)'
          : `#sk ${operator} :sk`
      }`;
    } else if (input.index === 'token') {
      return '#pk = :pk';
    } else if (input.index === 'publicId') {
      return '#pk = :pk';
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

/** queryRepository */
export async function queryRepository(
  input: Readonly<QueryRepositoryInput>,
  {
    limit = undefined,
    nextToken,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryRepositoryOutput>> {
  const tableName = process.env.TABLE_APPLICATION_DATA;
  assert(tableName, 'TABLE_APPLICATION_DATA is not set');

  const ExpressionAttributeNames = makeEanForQueryRepository(input);
  const ExpressionAttributeValues = makeEavForQueryRepository(input);
  const KeyConditionExpression = makeKceForQueryRepository(input, {operator});

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
      assert(
        item._et === 'Repository',
        () =>
          new DataIntegrityError(
            `Query result included at item with type ${item._et}. Only Repository was expected.`
          )
      );
      return unmarshallRepository(item);
    }),
    nextToken: lastEvaluatedKey,
  };
}

/** queries the Repository table by primary key using a node id */
export async function queryRepositoryByNodeId(
  id: Scalars['ID']
): Promise<Readonly<Omit<ResultType<Repository>, 'metrics'>>> {
  const primaryKeyValues = Base64.decode(id)
    .split(':')
    .slice(1)
    .join(':')
    .split('#');

  const primaryKey: QueryRepositoryInput = {
    vendor: primaryKeyValues[1] as Vendor,
    externalId: primaryKeyValues[2],
  };

  const {capacity, items} = await queryRepository(primaryKey);

  assert(items.length > 0, () => new NotFoundError('Repository', primaryKey));
  assert(
    items.length < 2,
    () => new DataIntegrityError(`Found multiple Repository with id ${id}`)
  );

  return {capacity, item: items[0]};
}

/** queries the Repository table by primary key using a node id */
export async function queryRepositoryByPublicId(
  publicId: Scalars['String']
): Promise<Readonly<Omit<ResultType<Repository>, 'metrics'>>> {
  const {capacity, items} = await queryRepository({
    index: 'publicId',
    publicId,
  });

  assert(items.length > 0, () => new NotFoundError('Repository', {publicId}));
  assert(
    items.length < 2,
    () =>
      new DataIntegrityError(
        `Found multiple Repository with publicId ${publicId}`
      )
  );

  return {capacity, item: items[0]};
}

export interface MarshallRepositoryOutput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type MarshallRepositoryInput = Required<
  Pick<
    Repository,
    | 'externalAccountId'
    | 'externalId'
    | 'externalInstallationId'
    | 'organization'
    | 'token'
    | 'vendor'
  >
> &
  Partial<
    Pick<Repository, 'defaultBranchName' | 'private' | 'repo' | 'version'>
  >;

/** Marshalls a DynamoDB record into a Repository object */
export function marshallRepository(
  input: MarshallRepositoryInput,
  now = new Date()
): MarshallRepositoryOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
    '#externalAccountId = :externalAccountId',
    '#externalId = :externalId',
    '#externalInstallationId = :externalInstallationId',
    '#organization = :organization',
    '#token = :token',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
    '#gsi1pk = :gsi1pk',
    '#gsi1sk = :gsi1sk',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#externalAccountId': 'external_account_id',
    '#externalId': 'external_id',
    '#externalInstallationId': 'external_installation_id',
    '#organization': 'organization',
    '#token': 'token',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
    '#gsi1pk': 'gsi1pk',
    '#gsi1sk': 'gsi1sk',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'Repository',
    ':externalAccountId': input.externalAccountId,
    ':externalId': input.externalId,
    ':externalInstallationId': input.externalInstallationId,
    ':organization': input.organization,
    ':token': input.token,
    ':vendor': input.vendor,
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
    ':gsi1pk': `REPOSITORY#${input.vendor}#${input.organization}`,
    ':gsi1sk': `REPOSITORY#${input.repo}`,
  };

  if (
    'defaultBranchName' in input &&
    typeof input.defaultBranchName !== 'undefined'
  ) {
    ean['#defaultBranchName'] = 'default_branch_name';
    eav[':defaultBranchName'] = input.defaultBranchName;
    updateExpression.push('#defaultBranchName = :defaultBranchName');
  }

  if ('private' in input && typeof input.private !== 'undefined') {
    ean['#private'] = 'private';
    eav[':private'] = input.private;
    updateExpression.push('#private = :private');
  }

  if ('repo' in input && typeof input.repo !== 'undefined') {
    ean['#repo'] = 'repo';
    eav[':repo'] = input.repo;
    updateExpression.push('#repo = :repo');
  }
  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
  };
}

/** Unmarshalls a DynamoDB record into a Repository object */
export function unmarshallRepository(item: Record<string, any>): Repository {
  let result: Repository = {
    createdAt: unmarshallRequiredField(
      item,
      'createdAt',
      ['_ct'],
      (v) => new Date(v)
    ),
    externalAccountId: unmarshallRequiredField(item, 'externalAccountId', [
      'external_account_id',
      'externalAccountId',
    ]),
    externalId: unmarshallRequiredField(item, 'externalId', [
      'external_id',
      'externalId',
    ]),
    externalInstallationId: unmarshallRequiredField(
      item,
      'externalInstallationId',
      ['external_installation_id', 'externalInstallationId']
    ),
    id: Base64.encode(`Repository:${item.pk}#:#${item.sk}`),
    organization: unmarshallRequiredField(item, 'organization', [
      'organization',
      'organization',
    ]),
    publicId: unmarshallRequiredField(item, 'publicId', ['publicId']),
    token: unmarshallRequiredField(item, 'token', ['token', 'token']),
    updatedAt: unmarshallRequiredField(
      item,
      'updatedAt',
      ['_md'],
      (v) => new Date(v)
    ),
    vendor: unmarshallRequiredField(item, 'vendor', ['vendor', 'vendor']),
    version: unmarshallRequiredField(item, 'version', ['_v']),
  };

  if ('default_branch_name' in item || 'defaultBranchName' in item) {
    result = {
      ...result,
      defaultBranchName: unmarshallOptionalField(item, 'defaultBranchName', [
        'default_branch_name',
        'defaultBranchName',
      ]),
    };
  }
  if ('private' in item || 'private' in item) {
    result = {
      ...result,
      private: unmarshallOptionalField(item, 'private', ['private', 'private']),
    };
  }
  if ('repo' in item || 'repo' in item) {
    result = {
      ...result,
      repo: unmarshallOptionalField(item, 'repo', ['repo', 'repo']),
    };
  }

  return result;
}

export interface UserSessionPrimaryKey {
  sessionId: Scalars['String'];
}

export type CreateUserSessionInput = Omit<
  UserSession,
  | 'computedField'
  | 'createdAt'
  | 'expires'
  | 'id'
  | 'publicId'
  | 'updatedAt'
  | 'version'
> &
  Partial<Pick<UserSession, 'expires'>>;
export type CreateUserSessionOutput = ResultType<UserSession>;
/**  */
export async function createUserSession(
  _input: Readonly<CreateUserSessionInput>
): Promise<Readonly<CreateUserSessionOutput>> {
  const tableName = process.env.TABLE_USER_SESSIONS;
  assert(tableName, 'TABLE_USER_SESSIONS is not set');

  const now = new Date();

  // This has to be cast because we're adding computed fields on the next
  // lines.
  const input: MarshallUserSessionInput = {
    ..._input,
  } as MarshallUserSessionInput;

  let computedFieldComputed = false;
  let computedFieldComputedValue: UserSession['computedField'];
  Object.defineProperty(input, 'computedField', {
    enumerable: true,
    /** getter */
    get() {
      if (!computedFieldComputed) {
        computedFieldComputed = true;
        computedFieldComputedValue = computeField(this);
      }
      return computedFieldComputedValue;
    },
  });

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallUserSession(input, now);

  const publicId = idGenerator();
  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const commandInput: UpdateCommandInput = {
    ConditionExpression: 'attribute_not_exists(#pk)',
    ExpressionAttributeNames: {
      ...ExpressionAttributeNames,
      '#createdAt': '_ct',
      '#publicId': 'publicId',
    },
    ExpressionAttributeValues: {
      ...ExpressionAttributeValues,
      ':createdAt': now.getTime(),
      ':publicId': publicId,
    },
    Key: {pk: `USER_SESSION#${input.sessionId}`},
    ReturnConsumedCapacity: 'INDEXES',
    ReturnItemCollectionMetrics: 'SIZE',
    ReturnValues: 'ALL_NEW',
    TableName: tableName,
    UpdateExpression: [
      ...UpdateExpression.split(', '),
      '#createdAt = :createdAt',
      '#publicId = :publicId',
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
  | 'computedField'
  | 'createdAt'
  | 'expires'
  | 'id'
  | 'publicId'
  | 'updatedAt'
  | 'version'
> &
  Partial<Pick<UserSession, 'expires'>> &
  Partial<Pick<UserSession, 'createdAt'>>;

export type BlindWriteUserSessionOutput = ResultType<UserSession>;
/** */
export async function blindWriteUserSession(
  _input: Readonly<BlindWriteUserSessionInput>
): Promise<Readonly<BlindWriteUserSessionOutput>> {
  const tableName = process.env.TABLE_USER_SESSIONS;
  assert(tableName, 'TABLE_USER_SESSIONS is not set');
  const now = new Date();

  // This has to be cast because we're adding computed fields on the next
  // lines.
  const input: MarshallUserSessionInput = {
    ..._input,
  } as MarshallUserSessionInput;

  let computedFieldComputed = false;
  let computedFieldComputedValue: UserSession['computedField'];
  Object.defineProperty(input, 'computedField', {
    enumerable: true,
    /** getter */
    get() {
      if (!computedFieldComputed) {
        computedFieldComputed = true;
        computedFieldComputedValue = computeField(this);
      }
      return computedFieldComputedValue;
    },
  });

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
    '#publicId': 'publicId',
  };
  const eav = {
    ...ExpressionAttributeValues,
    ':one': 1,
    ':createdAt': now.getTime(),
    ':publicId': idGenerator(),
  };
  const ue = `${[
    ...UpdateExpression.split(', ').filter((e) => !e.startsWith('#version')),
    '#createdAt = if_not_exists(#createdAt, :createdAt)',
    '#publicId = if_not_exists(#publicId, :publicId)',
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
  const tableName = process.env.TABLE_USER_SESSIONS;
  assert(tableName, 'TABLE_USER_SESSIONS is not set');

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
  const tableName = process.env.TABLE_USER_SESSIONS;
  assert(tableName, 'TABLE_USER_SESSIONS is not set');

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

export type UpdateUserSessionInput = Omit<
  UserSession,
  'computedField' | 'createdAt' | 'expires' | 'id' | 'publicId' | 'updatedAt'
> &
  Partial<Pick<UserSession, 'expires'>>;
export type UpdateUserSessionOutput = ResultType<UserSession>;

/**  */
export async function updateUserSession(
  _input: Readonly<UpdateUserSessionInput>
): Promise<Readonly<UpdateUserSessionOutput>> {
  const tableName = process.env.TABLE_USER_SESSIONS;
  assert(tableName, 'TABLE_USER_SESSIONS is not set');

  // This has to be cast because we're adding computed fields on the next
  // lines.
  const input: MarshallUserSessionInput = {
    ..._input,
  } as MarshallUserSessionInput;

  let computedFieldComputed = false;
  let computedFieldComputedValue: UserSession['computedField'];
  Object.defineProperty(input, 'computedField', {
    enumerable: true,
    /** getter */
    get() {
      if (!computedFieldComputed) {
        computedFieldComputed = true;
        computedFieldComputedValue = computeField(this);
      }
      return computedFieldComputedValue;
    },
  });

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallUserSession(input);
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

    assert(item, 'Expected DynamoDB to return an Attributes prop.');
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

export type QueryUserSessionInput =
  | {sessionId: Scalars['String']}
  | {index: 'publicId'; publicId: Scalars['String']};
export type QueryUserSessionOutput = MultiResultType<UserSession>;

/** helper */
function makeEanForQueryUserSession(
  input: QueryUserSessionInput
): Record<string, string> {
  if ('index' in input) {
    if (input.index === 'publicId') {
      return {'#pk': 'publicId'};
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {'#pk': 'pk'};
  }
}

/** helper */
function makeEavForQueryUserSession(
  input: QueryUserSessionInput
): Record<string, any> {
  if ('index' in input) {
    if (input.index === 'publicId') {
      return {':pk': `${input.publicId}`};
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {':pk': `USER_SESSION#${input.sessionId}`};
  }
}

/** helper */
function makeKceForQueryUserSession(
  input: QueryUserSessionInput,
  {operator}: Pick<QueryOptions, 'operator'>
): string {
  if ('index' in input) {
    if (input.index === 'publicId') {
      return '#pk = :pk';
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return '#pk = :pk';
  }
}

/** queryUserSession */
export async function queryUserSession(
  input: Readonly<QueryUserSessionInput>,
  {
    limit = undefined,
    nextToken,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryUserSessionOutput>> {
  const tableName = process.env.TABLE_USER_SESSIONS;
  assert(tableName, 'TABLE_USER_SESSIONS is not set');

  const ExpressionAttributeNames = makeEanForQueryUserSession(input);
  const ExpressionAttributeValues = makeEavForQueryUserSession(input);
  const KeyConditionExpression = makeKceForQueryUserSession(input, {operator});

  const commandInput: QueryCommandInput = {
    ConsistentRead: !('index' in input),
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
      assert(
        item._et === 'UserSession',
        () =>
          new DataIntegrityError(
            `Query result included at item with type ${item._et}. Only UserSession was expected.`
          )
      );
      return unmarshallUserSession(item);
    }),
    nextToken: lastEvaluatedKey,
  };
}

/** queries the UserSession table by primary key using a node id */
export async function queryUserSessionByNodeId(
  id: Scalars['ID']
): Promise<Readonly<Omit<ResultType<UserSession>, 'metrics'>>> {
  const primaryKeyValues = Base64.decode(id)
    .split(':')
    .slice(1)
    .join(':')
    .split('#');

  const primaryKey: QueryUserSessionInput = {
    sessionId: primaryKeyValues[1],
  };

  const {capacity, items} = await queryUserSession(primaryKey);

  assert(items.length > 0, () => new NotFoundError('UserSession', primaryKey));
  assert(
    items.length < 2,
    () => new DataIntegrityError(`Found multiple UserSession with id ${id}`)
  );

  return {capacity, item: items[0]};
}

/** queries the UserSession table by primary key using a node id */
export async function queryUserSessionByPublicId(
  publicId: Scalars['String']
): Promise<Readonly<Omit<ResultType<UserSession>, 'metrics'>>> {
  const {capacity, items} = await queryUserSession({
    index: 'publicId',
    publicId,
  });

  assert(items.length > 0, () => new NotFoundError('UserSession', {publicId}));
  assert(
    items.length < 2,
    () =>
      new DataIntegrityError(
        `Found multiple UserSession with publicId ${publicId}`
      )
  );

  return {capacity, item: items[0]};
}

export interface MarshallUserSessionOutput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type MarshallUserSessionInput = Required<
  Pick<UserSession, 'session' | 'sessionId'>
> &
  Partial<
    Pick<
      UserSession,
      'aliasedField' | 'computedField' | 'expires' | 'optionalField' | 'version'
    >
  >;

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

  if ('aliasedField' in input && typeof input.aliasedField !== 'undefined') {
    ean['#aliasedField'] = 'renamedField';
    eav[':aliasedField'] = input.aliasedField;
    updateExpression.push('#aliasedField = :aliasedField');
  }

  if ('computedField' in input && typeof input.computedField !== 'undefined') {
    ean['#computedField'] = 'computed_field';
    eav[':computedField'] = input.computedField;
    updateExpression.push('#computedField = :computedField');
  }

  if ('optionalField' in input && typeof input.optionalField !== 'undefined') {
    ean['#optionalField'] = 'optional_field';
    eav[':optionalField'] = input.optionalField;
    updateExpression.push('#optionalField = :optionalField');
  }
  if ('expires' in input && typeof input.expires !== 'undefined') {
    assert(
      !Number.isNaN(input.expires?.getTime()),
      'expires was passed but is not a valid date'
    );
    ean['#expires'] = 'ttl';
    eav[':expires'] =
      input.expires === null
        ? null
        : Math.floor(input.expires.getTime() / 1000);
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
  let result: UserSession = {
    createdAt: unmarshallRequiredField(
      item,
      'createdAt',
      ['_ct'],
      (v) => new Date(v)
    ),
    id: Base64.encode(`UserSession:${item.pk}`),
    publicId: unmarshallRequiredField(item, 'publicId', ['publicId']),
    session: unmarshallRequiredField(item, 'session', ['session', 'session']),
    sessionId: unmarshallRequiredField(item, 'sessionId', [
      'session_id',
      'sessionId',
    ]),
    updatedAt: unmarshallRequiredField(
      item,
      'updatedAt',
      ['_md'],
      (v) => new Date(v)
    ),
    version: unmarshallRequiredField(item, 'version', ['_v']),
  };

  if ('renamedField' in item) {
    result = {
      ...result,
      aliasedField: unmarshallOptionalField(item, 'aliasedField', [
        'renamedField',
      ]),
    };
  }
  if ('computed_field' in item || 'computedField' in item) {
    result = {
      ...result,
      computedField: unmarshallOptionalField(item, 'computedField', [
        'computed_field',
        'computedField',
      ]),
    };
  }
  if ('ttl' in item) {
    result = {
      ...result,
      expires: unmarshallOptionalField(
        item,
        'expires',
        ['ttl'],
        (v) => new Date(v * 1000)
      ),
    };
  }
  if ('optional_field' in item || 'optionalField' in item) {
    result = {
      ...result,
      optionalField: unmarshallOptionalField(item, 'optionalField', [
        'optional_field',
        'optionalField',
      ]),
    };
  }

  let computedFieldComputed = false;
  const computedFieldDatabaseValue = unmarshallOptionalField(
    item,
    'computedField',
    ['computed_field', 'computedField']
  );
  let computedFieldComputedValue: UserSession['computedField'];
  Object.defineProperty(result, 'computedField', {
    enumerable: true,
    /** getter */
    get() {
      if (!computedFieldComputed) {
        computedFieldComputed = true;
        if (typeof computedFieldDatabaseValue !== 'undefined') {
          computedFieldComputedValue = computedFieldDatabaseValue;
        } else {
          computedFieldComputedValue = computeField(this);
        }
      }
      return computedFieldComputedValue;
    },
  });

  return result;
}
