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

/** Describes the result of a specific Case execution. */
export type CaseInstance = Model &
  Timestamped &
  Versioned & {
    __typename?: 'CaseInstance';
    branchName: Scalars['String'];
    conclusion: Scalars['String'];
    createdAt: Scalars['Date'];
    duration?: Maybe<Scalars['Float']>;
    filename?: Maybe<Scalars['String']>;
    id: Scalars['ID'];
    label?: Maybe<Scalars['String']>;
    lineage: Scalars['String'];
    repoId: Scalars['String'];
    retry: Scalars['Int'];
    sha: Scalars['String'];
    updatedAt: Scalars['Date'];
    vendor: Vendor;
    version: Scalars['Int'];
  };

/** Describes the aggregate state of a Case. */
export type CaseSummary = Model &
  Timestamped &
  Versioned & {
    __typename?: 'CaseSummary';
    branchName: Scalars['String'];
    createdAt: Scalars['Date'];
    duration: Scalars['Float'];
    id: Scalars['ID'];
    label?: Maybe<Scalars['String']>;
    lineage: Scalars['String'];
    repoId: Scalars['String'];
    stability: Scalars['Float'];
    updatedAt: Scalars['Date'];
    vendor: Vendor;
    version: Scalars['Int'];
  };

/** CDC Event Types */
export type CdcEvent = 'INSERT' | 'MODIFY' | 'REMOVE' | 'UPSERT';

/** Describes the stability and duration of each submitted file */
export type FileTiming = Model &
  Timestamped &
  Versioned & {
    __typename?: 'FileTiming';
    branchName: Scalars['String'];
    createdAt: Scalars['Date'];
    duration: Scalars['Float'];
    filename: Scalars['String'];
    id: Scalars['ID'];
    label?: Maybe<Scalars['String']>;
    repoId: Scalars['String'];
    updatedAt: Scalars['Date'];
    vendor: Vendor;
    version: Scalars['Int'];
  };

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

/** Not used. Just here to satisfy ESLint. */
export interface Query {
  __typename?: 'Query';
  model?: Maybe<Model>;
  node?: Maybe<Node>;
}

/** Not used. Just here to satisfy ESLint. */
export interface QueryModelArgs {
  id: Scalars['ID'];
}

/** Not used. Just here to satisfy ESLint. */
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

/**
 * Support Vendors. Remember to add aliases in .graphqlrc.js to maintain backwards
 * compatibility with pre-graphql tables.
 */
export type Vendor = 'GITHUB';

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

export interface CaseInstancePrimaryKey {
  branchName: Scalars['String'];
  label?: Maybe<Scalars['String']>;
  lineage: Scalars['String'];
  repoId: Scalars['String'];
  retry: Scalars['Int'];
  sha: Scalars['String'];
  vendor: Vendor;
}

export type CreateCaseInstanceInput = Omit<
  CaseInstance,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type CreateCaseInstanceOutput = ResultType<CaseInstance>;
/**  */
export async function createCaseInstance(
  input: Readonly<CreateCaseInstanceInput>
): Promise<Readonly<CreateCaseInstanceOutput>> {
  const tableName = process.env.TABLE_CASE_INSTANCE;
  assert(tableName, 'TABLE_CASE_INSTANCE is not set');

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallCaseInstance(input, now);
  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
    new UpdateCommand({
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
        pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}#${input.lineage}`,
        sk: `INSTANCE#${input.sha}#${input.retry}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: `${UpdateExpression}, #createdAt = :createdAt`,
    })
  );

  assert(
    capacity,
    'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
  );

  assert(item, 'Expected DynamoDB ot return an Attributes prop.');
  assert(
    item._et === 'CaseInstance',
    () =>
      new DataIntegrityError(
        `Expected to write CaseInstance but wrote ${item?._et} instead`
      )
  );

  return {
    capacity,
    item: unmarshallCaseInstance(item),
    metrics,
  };
}

export type BlindWriteCaseInstanceInput = Omit<
  CaseInstance,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type BlindWriteCaseInstanceOutput = ResultType<CaseInstance>;
/** */
export async function blindWriteCaseInstance(
  input: Readonly<BlindWriteCaseInstanceInput>
): Promise<Readonly<BlindWriteCaseInstanceOutput>> {
  const tableName = process.env.TABLE_CASE_INSTANCE;
  assert(tableName, 'TABLE_CASE_INSTANCE is not set');
  const now = new Date();
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallCaseInstance(input, now);

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

  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
    new UpdateCommand({
      ExpressionAttributeNames: ean,
      ExpressionAttributeValues: eav,
      Key: {
        pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}#${input.lineage}`,
        sk: `INSTANCE#${input.sha}#${input.retry}`,
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
    item._et === 'CaseInstance',
    () =>
      new DataIntegrityError(
        `Expected to write CaseInstance but wrote ${item?._et} instead`
      )
  );

  return {
    capacity,
    item: unmarshallCaseInstance(item),
    metrics,
  };
}

export type DeleteCaseInstanceOutput = ResultType<void>;

/**  */
export async function deleteCaseInstance(
  input: CaseInstancePrimaryKey
): Promise<DeleteCaseInstanceOutput> {
  const tableName = process.env.TABLE_CASE_INSTANCE;
  assert(tableName, 'TABLE_CASE_INSTANCE is not set');

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(
        new DeleteCommand({
          ConditionExpression: 'attribute_exists(#pk)',
          ExpressionAttributeNames: {
            '#pk': 'pk',
          },
          Key: {
            pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}#${input.lineage}`,
            sk: `INSTANCE#${input.sha}#${input.retry}`,
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
      throw new NotFoundError('CaseInstance', input);
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type ReadCaseInstanceOutput = ResultType<CaseInstance>;

/**  */
export async function readCaseInstance(
  input: CaseInstancePrimaryKey
): Promise<Readonly<ReadCaseInstanceOutput>> {
  const tableName = process.env.TABLE_CASE_INSTANCE;
  assert(tableName, 'TABLE_CASE_INSTANCE is not set');

  const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
    new GetCommand({
      ConsistentRead: false,
      Key: {
        pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}#${input.lineage}`,
        sk: `INSTANCE#${input.sha}#${input.retry}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      TableName: tableName,
    })
  );

  assert(
    capacity,
    'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
  );

  assert(item, () => new NotFoundError('CaseInstance', input));
  assert(
    item._et === 'CaseInstance',
    () =>
      new DataIntegrityError(
        `Expected ${JSON.stringify(input)} to load a CaseInstance but loaded ${
          item._et
        } instead`
      )
  );

  return {
    capacity,
    item: unmarshallCaseInstance(item),
    metrics: undefined,
  };
}

export type TouchCaseInstanceOutput = ResultType<void>;

/**  */
export async function touchCaseInstance(
  input: CaseInstancePrimaryKey
): Promise<TouchCaseInstanceOutput> {
  const tableName = process.env.TABLE_CASE_INSTANCE;
  assert(tableName, 'TABLE_CASE_INSTANCE is not set');
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
            pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}#${input.lineage}`,
            sk: `INSTANCE#${input.sha}#${input.retry}`,
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
      throw new NotFoundError('CaseInstance', input);
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type UpdateCaseInstanceInput = Omit<
  CaseInstance,
  'createdAt' | 'id' | 'updatedAt'
>;
export type UpdateCaseInstanceOutput = ResultType<CaseInstance>;

/**  */
export async function updateCaseInstance(
  input: Readonly<UpdateCaseInstanceInput>
): Promise<Readonly<UpdateCaseInstanceOutput>> {
  const tableName = process.env.TABLE_CASE_INSTANCE;
  assert(tableName, 'TABLE_CASE_INSTANCE is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallCaseInstance(input);
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
          pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}#${input.lineage}`,
          sk: `INSTANCE#${input.sha}#${input.retry}`,
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
      item._et === 'CaseInstance',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify({
            branchName: input.branchName,
            label: input.label,
            lineage: input.lineage,
            repoId: input.repoId,
            retry: input.retry,
            sha: input.sha,
            vendor: input.vendor,
          })} to update a CaseInstance but updated ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallCaseInstance(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        await readCaseInstance(input);
      } catch {
        throw new NotFoundError('CaseInstance', {
          branchName: input.branchName,
          label: input.label,
          lineage: input.lineage,
          repoId: input.repoId,
          retry: input.retry,
          sha: input.sha,
          vendor: input.vendor,
        });
      }
      throw new OptimisticLockingError('CaseInstance', {
        branchName: input.branchName,
        label: input.label,
        lineage: input.lineage,
        repoId: input.repoId,
        retry: input.retry,
        sha: input.sha,
        vendor: input.vendor,
      });
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type QueryCaseInstanceInput =
  | {
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      lineage: Scalars['String'];
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      lineage: Scalars['String'];
      repoId: Scalars['String'];
      sha: Scalars['String'];
      vendor: Vendor;
    }
  | {
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      lineage: Scalars['String'];
      repoId: Scalars['String'];
      retry: Scalars['Int'];
      sha: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'gsi1';
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      sha: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'gsi1';
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      lineage: Scalars['String'];
      repoId: Scalars['String'];
      sha: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'gsi1';
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      lineage: Scalars['String'];
      repoId: Scalars['String'];
      retry: Scalars['Int'];
      sha: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'gsi2';
      branchName: Scalars['String'];
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'gsi2';
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'gsi2';
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      sha: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'lsi1';
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      lineage: Scalars['String'];
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'lsi1';
      branchName: Scalars['String'];
      createdAt: Scalars['Date'];
      label?: Maybe<Scalars['String']>;
      lineage: Scalars['String'];
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'lsi2';
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      lineage: Scalars['String'];
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'lsi2';
      branchName: Scalars['String'];
      conclusion: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      lineage: Scalars['String'];
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'lsi2';
      branchName: Scalars['String'];
      conclusion: Scalars['String'];
      createdAt: Scalars['Date'];
      label?: Maybe<Scalars['String']>;
      lineage: Scalars['String'];
      repoId: Scalars['String'];
      vendor: Vendor;
    };
export type QueryCaseInstanceOutput = MultiResultType<CaseInstance>;

/** helper */
function makePartitionKeyForQueryCaseInstance(
  input: QueryCaseInstanceInput
): string {
  if (!('index' in input)) {
    return `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}#${input.lineage}`;
  } else if ('index' in input && input.index === 'gsi1') {
    return `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}#${input.sha}`;
  } else if ('index' in input && input.index === 'gsi2') {
    return `CASE#${input.vendor}#${input.repoId}#${input.branchName}`;
  } else if ('index' in input && input.index === 'lsi1') {
    return `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}#${input.lineage}`;
  } else if ('index' in input && input.index === 'lsi2') {
    return `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}#${input.lineage}`;
  }

  throw new Error('Could not construct partition key from input');
}

/** helper */
function makeSortKeyForQueryCaseInstance(
  input: QueryCaseInstanceInput
): string | undefined {
  if ('index' in input) {
    if (input.index === 'gsi1') {
      return [
        'INSTANCE',
        'lineage' in input && input.lineage,
        'retry' in input && input.retry,
      ]
        .filter(Boolean)
        .join('#');
    } else if (input.index === 'gsi2') {
      return [
        'INSTANCE',
        'label' in input && input.label,
        'sha' in input && input.sha,
      ]
        .filter(Boolean)
        .join('#');
    } else if (input.index === 'lsi1') {
      return ['INSTANCE', 'createdAt' in input && input.createdAt]
        .filter(Boolean)
        .join('#');
    } else if (input.index === 'lsi2') {
      return [
        'INSTANCE',
        'conclusion' in input && input.conclusion,
        'createdAt' in input && input.createdAt,
      ]
        .filter(Boolean)
        .join('#');
    }
  } else {
    return [
      'INSTANCE',
      'sha' in input && input.sha,
      'retry' in input && input.retry,
    ]
      .filter(Boolean)
      .join('#');
  }
}

/** helper */
function makeEavPkForQueryCaseInstance(input: QueryCaseInstanceInput): string {
  if ('index' in input) {
    const lsis = ['lsi1', 'lsi2'];
    if (lsis.includes(input.index)) {
      return 'pk';
    }
    return `${input.index}pk`;
  }
  return 'pk';
}

/** helper */
function makeEavSkForQueryCaseInstance(input: QueryCaseInstanceInput): string {
  if ('index' in input) {
    const lsis = ['lsi1', 'lsi2'];
    if (lsis.includes(input.index)) {
      return input.index;
    }
    return `${input.index}sk`;
  }
  return 'sk';
}

/** queryCaseInstance */
export async function queryCaseInstance(
  input: Readonly<QueryCaseInstanceInput>,
  {
    limit = undefined,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryCaseInstanceOutput>> {
  const tableName = process.env.TABLE_CASE_INSTANCE;
  assert(tableName, 'TABLE_CASE_INSTANCE is not set');

  const {ConsumedCapacity: capacity, Items: items = []} =
    await ddbDocClient.send(
      new QueryCommand({
        ConsistentRead: false,
        ExpressionAttributeNames: {
          '#pk': makeEavPkForQueryCaseInstance(input),
          '#sk': makeEavSkForQueryCaseInstance(input),
        },
        ExpressionAttributeValues: {
          ':pk': makePartitionKeyForQueryCaseInstance(input),
          ':sk': makeSortKeyForQueryCaseInstance(input),
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
      assert(item._et === 'CaseInstance', () => new DataIntegrityError('TODO'));
      return unmarshallCaseInstance(item);
    }),
  };
}

/** queries the CaseInstance table by primary key using a node id */
export async function queryCaseInstanceByNodeId(
  id: Scalars['ID']
): Promise<Readonly<Omit<ResultType<CaseInstance>, 'metrics'>>> {
  const primaryKeyValues = Base64.decode(id)
    .split(':')
    .slice(1)
    .join(':')
    .split('#');

  const primaryKey: QueryCaseInstanceInput = {
    vendor: primaryKeyValues[1] as Vendor,
    repoId: primaryKeyValues[2],
    branchName: primaryKeyValues[3],
    label: primaryKeyValues[4],
    lineage: primaryKeyValues[5],
  };

  if (typeof primaryKeyValues[2] !== 'undefined') {
    // @ts-ignore - TSC will usually see this as an error because it determined
    // that primaryKey is the no-sort-fields-specified version of the type.
    primaryKey.sha = primaryKeyValues[8];
  }

  if (typeof primaryKeyValues[3] !== 'undefined') {
    // @ts-ignore - TSC will usually see this as an error because it determined
    // that primaryKey is the no-sort-fields-specified version of the type.
    primaryKey.retry = Number(primaryKeyValues[9]);
  }

  const {capacity, items} = await queryCaseInstance(primaryKey);

  assert(items.length > 0, () => new NotFoundError('CaseInstance', primaryKey));
  assert(
    items.length < 2,
    () => new DataIntegrityError(`Found multiple CaseInstance with id ${id}`)
  );

  return {capacity, item: items[0]};
}

export interface MarshallCaseInstanceOutput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type MarshallCaseInstanceInput = Required<
  Pick<
    CaseInstance,
    | 'branchName'
    | 'conclusion'
    | 'lineage'
    | 'repoId'
    | 'retry'
    | 'sha'
    | 'vendor'
  >
> &
  Partial<Pick<CaseInstance, 'duration' | 'filename' | 'label' | 'version'>>;

/** Marshalls a DynamoDB record into a CaseInstance object */
export function marshallCaseInstance(
  input: MarshallCaseInstanceInput,
  now = new Date()
): MarshallCaseInstanceOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
    '#branchName = :branchName',
    '#conclusion = :conclusion',
    '#lineage = :lineage',
    '#repoId = :repoId',
    '#retry = :retry',
    '#sha = :sha',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
    '#gsi1pk = :gsi1pk',
    '#gsi1sk = :gsi1sk',
    '#gsi2pk = :gsi2pk',
    '#gsi2sk = :gsi2sk',
    '#lsi1sk = :lsi1sk',
    '#lsi2sk = :lsi2sk',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#branchName': 'branch_name',
    '#conclusion': 'conclusion',
    '#lineage': 'lineage',
    '#repoId': 'repo_id',
    '#retry': 'retry',
    '#sha': 'sha',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
    '#gsi1pk': 'gsi1pk',
    '#gsi1sk': 'gsi1sk',
    '#gsi2pk': 'gsi2pk',
    '#gsi2sk': 'gsi2sk',
    '#lsi1sk': 'lsi1sk',
    '#lsi2sk': 'lsi2sk',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'CaseInstance',
    ':branchName': input.branchName,
    ':conclusion': input.conclusion,
    ':lineage': input.lineage,
    ':repoId': input.repoId,
    ':retry': input.retry,
    ':sha': input.sha,
    ':vendor': input.vendor,
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
    ':gsi1pk': `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}#${input.sha}`,
    ':gsi1sk': `INSTANCE#${input.lineage}#${input.retry}`,
    ':gsi2pk': `CASE#${input.vendor}#${input.repoId}#${input.branchName}`,
    ':gsi2sk': `INSTANCE#${input.label}#${input.sha}`,
    ':lsi1sk': `INSTANCE#input.createdAt.getTime()`,
    ':lsi2sk': `INSTANCE#${input.conclusion}#input.createdAt.getTime()`,
  };

  if ('duration' in input && typeof input.duration !== 'undefined') {
    ean['#duration'] = 'duration';
    eav[':duration'] = input.duration;
    updateExpression.push('#duration = :duration');
  }

  if ('filename' in input && typeof input.filename !== 'undefined') {
    ean['#filename'] = 'filename';
    eav[':filename'] = input.filename;
    updateExpression.push('#filename = :filename');
  }

  if ('label' in input && typeof input.label !== 'undefined') {
    ean['#label'] = 'label';
    eav[':label'] = input.label;
    updateExpression.push('#label = :label');
  }
  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
  };
}

/** Unmarshalls a DynamoDB record into a CaseInstance object */
export function unmarshallCaseInstance(
  item: Record<string, any>
): CaseInstance {
  if ('branch_name' in item) {
    assert(
      item.branch_name !== null,
      () => new DataIntegrityError('Expected branchName to be non-null')
    );
    assert(
      typeof item.branch_name !== 'undefined',
      () => new DataIntegrityError('Expected branchName to be defined')
    );
  }
  if ('conclusion' in item) {
    assert(
      item.conclusion !== null,
      () => new DataIntegrityError('Expected conclusion to be non-null')
    );
    assert(
      typeof item.conclusion !== 'undefined',
      () => new DataIntegrityError('Expected conclusion to be defined')
    );
  }
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
  if ('lineage' in item) {
    assert(
      item.lineage !== null,
      () => new DataIntegrityError('Expected lineage to be non-null')
    );
    assert(
      typeof item.lineage !== 'undefined',
      () => new DataIntegrityError('Expected lineage to be defined')
    );
  }
  if ('repo_id' in item) {
    assert(
      item.repo_id !== null,
      () => new DataIntegrityError('Expected repoId to be non-null')
    );
    assert(
      typeof item.repo_id !== 'undefined',
      () => new DataIntegrityError('Expected repoId to be defined')
    );
  }
  if ('retry' in item) {
    assert(
      item.retry !== null,
      () => new DataIntegrityError('Expected retry to be non-null')
    );
    assert(
      typeof item.retry !== 'undefined',
      () => new DataIntegrityError('Expected retry to be defined')
    );
  }
  if ('sha' in item) {
    assert(
      item.sha !== null,
      () => new DataIntegrityError('Expected sha to be non-null')
    );
    assert(
      typeof item.sha !== 'undefined',
      () => new DataIntegrityError('Expected sha to be defined')
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

  let result: CaseInstance = {
    branchName: item.branch_name,
    conclusion: item.conclusion,
    createdAt: new Date(item._ct),
    id: Base64.encode(`CaseInstance:${item.pk}#:#${item.sk}`),
    lineage: item.lineage,
    repoId: item.repo_id,
    retry: item.retry,
    sha: item.sha,
    updatedAt: new Date(item._md),
    vendor: item.vendor,
    version: item._v,
  };

  if ('duration' in item) {
    result = {
      ...result,
      duration: item.duration,
    };
  }

  if ('filename' in item) {
    result = {
      ...result,
      filename: item.filename,
    };
  }

  if ('label' in item) {
    result = {
      ...result,
      label: item.label,
    };
  }

  return result;
}

export interface CaseSummaryPrimaryKey {
  branchName: Scalars['String'];
  label?: Maybe<Scalars['String']>;
  lineage: Scalars['String'];
  repoId: Scalars['String'];
  vendor: Vendor;
}

export type CreateCaseSummaryInput = Omit<
  CaseSummary,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type CreateCaseSummaryOutput = ResultType<CaseSummary>;
/**  */
export async function createCaseSummary(
  input: Readonly<CreateCaseSummaryInput>
): Promise<Readonly<CreateCaseSummaryOutput>> {
  const tableName = process.env.TABLE_CASE_SUMMARY;
  assert(tableName, 'TABLE_CASE_SUMMARY is not set');

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallCaseSummary(input, now);
  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
    new UpdateCommand({
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
        pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
        sk: `SUMMARY#${input.lineage}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: `${UpdateExpression}, #createdAt = :createdAt`,
    })
  );

  assert(
    capacity,
    'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
  );

  assert(item, 'Expected DynamoDB ot return an Attributes prop.');
  assert(
    item._et === 'CaseSummary',
    () =>
      new DataIntegrityError(
        `Expected to write CaseSummary but wrote ${item?._et} instead`
      )
  );

  return {
    capacity,
    item: unmarshallCaseSummary(item),
    metrics,
  };
}

export type BlindWriteCaseSummaryInput = Omit<
  CaseSummary,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type BlindWriteCaseSummaryOutput = ResultType<CaseSummary>;
/** */
export async function blindWriteCaseSummary(
  input: Readonly<BlindWriteCaseSummaryInput>
): Promise<Readonly<BlindWriteCaseSummaryOutput>> {
  const tableName = process.env.TABLE_CASE_SUMMARY;
  assert(tableName, 'TABLE_CASE_SUMMARY is not set');
  const now = new Date();
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallCaseSummary(input, now);

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

  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
    new UpdateCommand({
      ExpressionAttributeNames: ean,
      ExpressionAttributeValues: eav,
      Key: {
        pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
        sk: `SUMMARY#${input.lineage}`,
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
    item._et === 'CaseSummary',
    () =>
      new DataIntegrityError(
        `Expected to write CaseSummary but wrote ${item?._et} instead`
      )
  );

  return {
    capacity,
    item: unmarshallCaseSummary(item),
    metrics,
  };
}

export type DeleteCaseSummaryOutput = ResultType<void>;

/**  */
export async function deleteCaseSummary(
  input: CaseSummaryPrimaryKey
): Promise<DeleteCaseSummaryOutput> {
  const tableName = process.env.TABLE_CASE_SUMMARY;
  assert(tableName, 'TABLE_CASE_SUMMARY is not set');

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(
        new DeleteCommand({
          ConditionExpression: 'attribute_exists(#pk)',
          ExpressionAttributeNames: {
            '#pk': 'pk',
          },
          Key: {
            pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
            sk: `SUMMARY#${input.lineage}`,
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
      throw new NotFoundError('CaseSummary', input);
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type ReadCaseSummaryOutput = ResultType<CaseSummary>;

/**  */
export async function readCaseSummary(
  input: CaseSummaryPrimaryKey
): Promise<Readonly<ReadCaseSummaryOutput>> {
  const tableName = process.env.TABLE_CASE_SUMMARY;
  assert(tableName, 'TABLE_CASE_SUMMARY is not set');

  const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
    new GetCommand({
      ConsistentRead: false,
      Key: {
        pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
        sk: `SUMMARY#${input.lineage}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      TableName: tableName,
    })
  );

  assert(
    capacity,
    'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
  );

  assert(item, () => new NotFoundError('CaseSummary', input));
  assert(
    item._et === 'CaseSummary',
    () =>
      new DataIntegrityError(
        `Expected ${JSON.stringify(input)} to load a CaseSummary but loaded ${
          item._et
        } instead`
      )
  );

  return {
    capacity,
    item: unmarshallCaseSummary(item),
    metrics: undefined,
  };
}

export type TouchCaseSummaryOutput = ResultType<void>;

/**  */
export async function touchCaseSummary(
  input: CaseSummaryPrimaryKey
): Promise<TouchCaseSummaryOutput> {
  const tableName = process.env.TABLE_CASE_SUMMARY;
  assert(tableName, 'TABLE_CASE_SUMMARY is not set');
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
            pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
            sk: `SUMMARY#${input.lineage}`,
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
      throw new NotFoundError('CaseSummary', input);
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type UpdateCaseSummaryInput = Omit<
  CaseSummary,
  'createdAt' | 'id' | 'updatedAt'
>;
export type UpdateCaseSummaryOutput = ResultType<CaseSummary>;

/**  */
export async function updateCaseSummary(
  input: Readonly<UpdateCaseSummaryInput>
): Promise<Readonly<UpdateCaseSummaryOutput>> {
  const tableName = process.env.TABLE_CASE_SUMMARY;
  assert(tableName, 'TABLE_CASE_SUMMARY is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallCaseSummary(input);
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
          pk: `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
          sk: `SUMMARY#${input.lineage}`,
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
      item._et === 'CaseSummary',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify({
            branchName: input.branchName,
            label: input.label,
            lineage: input.lineage,
            repoId: input.repoId,
            vendor: input.vendor,
          })} to update a CaseSummary but updated ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallCaseSummary(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        await readCaseSummary(input);
      } catch {
        throw new NotFoundError('CaseSummary', {
          branchName: input.branchName,
          label: input.label,
          lineage: input.lineage,
          repoId: input.repoId,
          vendor: input.vendor,
        });
      }
      throw new OptimisticLockingError('CaseSummary', {
        branchName: input.branchName,
        label: input.label,
        lineage: input.lineage,
        repoId: input.repoId,
        vendor: input.vendor,
      });
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type QueryCaseSummaryInput =
  | {
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      lineage: Scalars['String'];
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'lsi1';
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'lsi1';
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      stability: Scalars['Float'];
      vendor: Vendor;
    }
  | {
      index: 'lsi2';
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'lsi2';
      branchName: Scalars['String'];
      duration: Scalars['Float'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      vendor: Vendor;
    };
export type QueryCaseSummaryOutput = MultiResultType<CaseSummary>;

/** helper */
function makePartitionKeyForQueryCaseSummary(
  input: QueryCaseSummaryInput
): string {
  if (!('index' in input)) {
    return `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`;
  } else if ('index' in input && input.index === 'lsi1') {
    return `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`;
  } else if ('index' in input && input.index === 'lsi2') {
    return `CASE#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`;
  }

  throw new Error('Could not construct partition key from input');
}

/** helper */
function makeSortKeyForQueryCaseSummary(
  input: QueryCaseSummaryInput
): string | undefined {
  if ('index' in input) {
    if (input.index === 'lsi1') {
      return ['SUMMARY', 'stability' in input && input.stability]
        .filter(Boolean)
        .join('#');
    } else if (input.index === 'lsi2') {
      return ['SUMMARY', 'duration' in input && input.duration]
        .filter(Boolean)
        .join('#');
    }
  } else {
    return ['SUMMARY', 'lineage' in input && input.lineage]
      .filter(Boolean)
      .join('#');
  }
}

/** helper */
function makeEavPkForQueryCaseSummary(input: QueryCaseSummaryInput): string {
  return 'pk';
}

/** helper */
function makeEavSkForQueryCaseSummary(input: QueryCaseSummaryInput): string {
  if ('index' in input) {
    const lsis = ['lsi1', 'lsi2'];
    if (lsis.includes(input.index)) {
      return input.index;
    }
  }
  return 'sk';
}

/** queryCaseSummary */
export async function queryCaseSummary(
  input: Readonly<QueryCaseSummaryInput>,
  {
    limit = undefined,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryCaseSummaryOutput>> {
  const tableName = process.env.TABLE_CASE_SUMMARY;
  assert(tableName, 'TABLE_CASE_SUMMARY is not set');

  const {ConsumedCapacity: capacity, Items: items = []} =
    await ddbDocClient.send(
      new QueryCommand({
        ConsistentRead: false,
        ExpressionAttributeNames: {
          '#pk': makeEavPkForQueryCaseSummary(input),
          '#sk': makeEavSkForQueryCaseSummary(input),
        },
        ExpressionAttributeValues: {
          ':pk': makePartitionKeyForQueryCaseSummary(input),
          ':sk': makeSortKeyForQueryCaseSummary(input),
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
      assert(item._et === 'CaseSummary', () => new DataIntegrityError('TODO'));
      return unmarshallCaseSummary(item);
    }),
  };
}

/** queries the CaseSummary table by primary key using a node id */
export async function queryCaseSummaryByNodeId(
  id: Scalars['ID']
): Promise<Readonly<Omit<ResultType<CaseSummary>, 'metrics'>>> {
  const primaryKeyValues = Base64.decode(id)
    .split(':')
    .slice(1)
    .join(':')
    .split('#');

  const primaryKey: QueryCaseSummaryInput = {
    vendor: primaryKeyValues[1] as Vendor,
    repoId: primaryKeyValues[2],
    branchName: primaryKeyValues[3],
    label: primaryKeyValues[4],
  };

  if (typeof primaryKeyValues[2] !== 'undefined') {
    // @ts-ignore - TSC will usually see this as an error because it determined
    // that primaryKey is the no-sort-fields-specified version of the type.
    primaryKey.lineage = primaryKeyValues[7];
  }

  const {capacity, items} = await queryCaseSummary(primaryKey);

  assert(items.length > 0, () => new NotFoundError('CaseSummary', primaryKey));
  assert(
    items.length < 2,
    () => new DataIntegrityError(`Found multiple CaseSummary with id ${id}`)
  );

  return {capacity, item: items[0]};
}

export interface MarshallCaseSummaryOutput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type MarshallCaseSummaryInput = Required<
  Pick<
    CaseSummary,
    'branchName' | 'duration' | 'lineage' | 'repoId' | 'stability' | 'vendor'
  >
> &
  Partial<Pick<CaseSummary, 'label' | 'version'>>;

/** Marshalls a DynamoDB record into a CaseSummary object */
export function marshallCaseSummary(
  input: MarshallCaseSummaryInput,
  now = new Date()
): MarshallCaseSummaryOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
    '#branchName = :branchName',
    '#duration = :duration',
    '#lineage = :lineage',
    '#repoId = :repoId',
    '#stability = :stability',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
    '#lsi1sk = :lsi1sk',
    '#lsi2sk = :lsi2sk',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#branchName': 'branch_name',
    '#duration': 'duration',
    '#lineage': 'lineage',
    '#repoId': 'repo_id',
    '#stability': 'stability',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
    '#lsi1sk': 'lsi1sk',
    '#lsi2sk': 'lsi2sk',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'CaseSummary',
    ':branchName': input.branchName,
    ':duration': input.duration,
    ':lineage': input.lineage,
    ':repoId': input.repoId,
    ':stability': input.stability,
    ':vendor': input.vendor,
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
    ':lsi1sk': `SUMMARY#${input.stability}`,
    ':lsi2sk': `SUMMARY#${input.duration}`,
  };

  if ('label' in input && typeof input.label !== 'undefined') {
    ean['#label'] = 'label';
    eav[':label'] = input.label;
    updateExpression.push('#label = :label');
  }
  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
  };
}

/** Unmarshalls a DynamoDB record into a CaseSummary object */
export function unmarshallCaseSummary(item: Record<string, any>): CaseSummary {
  if ('branch_name' in item) {
    assert(
      item.branch_name !== null,
      () => new DataIntegrityError('Expected branchName to be non-null')
    );
    assert(
      typeof item.branch_name !== 'undefined',
      () => new DataIntegrityError('Expected branchName to be defined')
    );
  }
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
  if ('duration' in item) {
    assert(
      item.duration !== null,
      () => new DataIntegrityError('Expected duration to be non-null')
    );
    assert(
      typeof item.duration !== 'undefined',
      () => new DataIntegrityError('Expected duration to be defined')
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
  if ('lineage' in item) {
    assert(
      item.lineage !== null,
      () => new DataIntegrityError('Expected lineage to be non-null')
    );
    assert(
      typeof item.lineage !== 'undefined',
      () => new DataIntegrityError('Expected lineage to be defined')
    );
  }
  if ('repo_id' in item) {
    assert(
      item.repo_id !== null,
      () => new DataIntegrityError('Expected repoId to be non-null')
    );
    assert(
      typeof item.repo_id !== 'undefined',
      () => new DataIntegrityError('Expected repoId to be defined')
    );
  }
  if ('stability' in item) {
    assert(
      item.stability !== null,
      () => new DataIntegrityError('Expected stability to be non-null')
    );
    assert(
      typeof item.stability !== 'undefined',
      () => new DataIntegrityError('Expected stability to be defined')
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

  let result: CaseSummary = {
    branchName: item.branch_name,
    createdAt: new Date(item._ct),
    duration: item.duration,
    id: Base64.encode(`CaseSummary:${item.pk}#:#${item.sk}`),
    lineage: item.lineage,
    repoId: item.repo_id,
    stability: item.stability,
    updatedAt: new Date(item._md),
    vendor: item.vendor,
    version: item._v,
  };

  if ('label' in item) {
    result = {
      ...result,
      label: item.label,
    };
  }

  return result;
}

export interface FileTimingPrimaryKey {
  branchName: Scalars['String'];
  filename: Scalars['String'];
  label?: Maybe<Scalars['String']>;
  repoId: Scalars['String'];
  vendor: Vendor;
}

export type CreateFileTimingInput = Omit<
  FileTiming,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type CreateFileTimingOutput = ResultType<FileTiming>;
/**  */
export async function createFileTiming(
  input: Readonly<CreateFileTimingInput>
): Promise<Readonly<CreateFileTimingOutput>> {
  const tableName = process.env.TABLE_FILE_TIMING;
  assert(tableName, 'TABLE_FILE_TIMING is not set');

  const now = new Date();

  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallFileTiming(input, now);
  // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
  // cannot return the newly written values.
  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
    new UpdateCommand({
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
        pk: `TIMING#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
        sk: `FILE#${input.filename}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: `${UpdateExpression}, #createdAt = :createdAt`,
    })
  );

  assert(
    capacity,
    'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
  );

  assert(item, 'Expected DynamoDB ot return an Attributes prop.');
  assert(
    item._et === 'FileTiming',
    () =>
      new DataIntegrityError(
        `Expected to write FileTiming but wrote ${item?._et} instead`
      )
  );

  return {
    capacity,
    item: unmarshallFileTiming(item),
    metrics,
  };
}

export type BlindWriteFileTimingInput = Omit<
  FileTiming,
  'createdAt' | 'id' | 'updatedAt' | 'version'
>;
export type BlindWriteFileTimingOutput = ResultType<FileTiming>;
/** */
export async function blindWriteFileTiming(
  input: Readonly<BlindWriteFileTimingInput>
): Promise<Readonly<BlindWriteFileTimingOutput>> {
  const tableName = process.env.TABLE_FILE_TIMING;
  assert(tableName, 'TABLE_FILE_TIMING is not set');
  const now = new Date();
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallFileTiming(input, now);

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

  const {
    ConsumedCapacity: capacity,
    ItemCollectionMetrics: metrics,
    Attributes: item,
  } = await ddbDocClient.send(
    new UpdateCommand({
      ExpressionAttributeNames: ean,
      ExpressionAttributeValues: eav,
      Key: {
        pk: `TIMING#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
        sk: `FILE#${input.filename}`,
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
    item._et === 'FileTiming',
    () =>
      new DataIntegrityError(
        `Expected to write FileTiming but wrote ${item?._et} instead`
      )
  );

  return {
    capacity,
    item: unmarshallFileTiming(item),
    metrics,
  };
}

export type DeleteFileTimingOutput = ResultType<void>;

/**  */
export async function deleteFileTiming(
  input: FileTimingPrimaryKey
): Promise<DeleteFileTimingOutput> {
  const tableName = process.env.TABLE_FILE_TIMING;
  assert(tableName, 'TABLE_FILE_TIMING is not set');

  try {
    const {ConsumedCapacity: capacity, ItemCollectionMetrics: metrics} =
      await ddbDocClient.send(
        new DeleteCommand({
          ConditionExpression: 'attribute_exists(#pk)',
          ExpressionAttributeNames: {
            '#pk': 'pk',
          },
          Key: {
            pk: `TIMING#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
            sk: `FILE#${input.filename}`,
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
      throw new NotFoundError('FileTiming', input);
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type ReadFileTimingOutput = ResultType<FileTiming>;

/**  */
export async function readFileTiming(
  input: FileTimingPrimaryKey
): Promise<Readonly<ReadFileTimingOutput>> {
  const tableName = process.env.TABLE_FILE_TIMING;
  assert(tableName, 'TABLE_FILE_TIMING is not set');

  const {ConsumedCapacity: capacity, Item: item} = await ddbDocClient.send(
    new GetCommand({
      ConsistentRead: false,
      Key: {
        pk: `TIMING#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
        sk: `FILE#${input.filename}`,
      },
      ReturnConsumedCapacity: 'INDEXES',
      TableName: tableName,
    })
  );

  assert(
    capacity,
    'Expected ConsumedCapacity to be returned. This is a bug in codegen.'
  );

  assert(item, () => new NotFoundError('FileTiming', input));
  assert(
    item._et === 'FileTiming',
    () =>
      new DataIntegrityError(
        `Expected ${JSON.stringify(input)} to load a FileTiming but loaded ${
          item._et
        } instead`
      )
  );

  return {
    capacity,
    item: unmarshallFileTiming(item),
    metrics: undefined,
  };
}

export type TouchFileTimingOutput = ResultType<void>;

/**  */
export async function touchFileTiming(
  input: FileTimingPrimaryKey
): Promise<TouchFileTimingOutput> {
  const tableName = process.env.TABLE_FILE_TIMING;
  assert(tableName, 'TABLE_FILE_TIMING is not set');
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
            pk: `TIMING#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
            sk: `FILE#${input.filename}`,
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
      throw new NotFoundError('FileTiming', input);
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type UpdateFileTimingInput = Omit<
  FileTiming,
  'createdAt' | 'id' | 'updatedAt'
>;
export type UpdateFileTimingOutput = ResultType<FileTiming>;

/**  */
export async function updateFileTiming(
  input: Readonly<UpdateFileTimingInput>
): Promise<Readonly<UpdateFileTimingOutput>> {
  const tableName = process.env.TABLE_FILE_TIMING;
  assert(tableName, 'TABLE_FILE_TIMING is not set');
  const {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression,
  } = marshallFileTiming(input);
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
          pk: `TIMING#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`,
          sk: `FILE#${input.filename}`,
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
      item._et === 'FileTiming',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify({
            branchName: input.branchName,
            filename: input.filename,
            label: input.label,
            repoId: input.repoId,
            vendor: input.vendor,
          })} to update a FileTiming but updated ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallFileTiming(item),
      metrics,
    };
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      try {
        await readFileTiming(input);
      } catch {
        throw new NotFoundError('FileTiming', {
          branchName: input.branchName,
          filename: input.filename,
          label: input.label,
          repoId: input.repoId,
          vendor: input.vendor,
        });
      }
      throw new OptimisticLockingError('FileTiming', {
        branchName: input.branchName,
        filename: input.filename,
        label: input.label,
        repoId: input.repoId,
        vendor: input.vendor,
      });
    }
    if (err instanceof ServiceException) {
      throw new UnexpectedAwsError(err);
    }
    throw new UnexpectedError(err);
  }
}

export type QueryFileTimingInput =
  | {
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      branchName: Scalars['String'];
      filename: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'gsi2';
      branchName: Scalars['String'];
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'lsi1';
      branchName: Scalars['String'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      vendor: Vendor;
    }
  | {
      index: 'lsi1';
      branchName: Scalars['String'];
      duration: Scalars['Float'];
      label?: Maybe<Scalars['String']>;
      repoId: Scalars['String'];
      vendor: Vendor;
    };
export type QueryFileTimingOutput = MultiResultType<FileTiming>;

/** helper */
function makePartitionKeyForQueryFileTiming(
  input: QueryFileTimingInput
): string {
  if (!('index' in input)) {
    return `TIMING#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`;
  } else if ('index' in input && input.index === 'gsi2') {
    return `BRANCH#${input.vendor}#${input.repoId}#${input.branchName}`;
  } else if ('index' in input && input.index === 'lsi1') {
    return `TIMING#${input.vendor}#${input.repoId}#${input.branchName}#${input.label}`;
  }

  throw new Error('Could not construct partition key from input');
}

/** helper */
function makeSortKeyForQueryFileTiming(
  input: QueryFileTimingInput
): string | undefined {
  if ('index' in input) {
    if (input.index === 'gsi2') {
      return ['FILE'].filter(Boolean).join('#');
    } else if (input.index === 'lsi1') {
      return ['FILE', 'duration' in input && input.duration]
        .filter(Boolean)
        .join('#');
    }
  } else {
    return ['FILE', 'filename' in input && input.filename]
      .filter(Boolean)
      .join('#');
  }
}

/** helper */
function makeEavPkForQueryFileTiming(input: QueryFileTimingInput): string {
  if ('index' in input) {
    const lsis = ['lsi1'];
    if (lsis.includes(input.index)) {
      return 'pk';
    }
    return `${input.index}pk`;
  }
  return 'pk';
}

/** helper */
function makeEavSkForQueryFileTiming(input: QueryFileTimingInput): string {
  if ('index' in input) {
    const lsis = ['lsi1'];
    if (lsis.includes(input.index)) {
      return input.index;
    }
    return `${input.index}sk`;
  }
  return 'sk';
}

/** queryFileTiming */
export async function queryFileTiming(
  input: Readonly<QueryFileTimingInput>,
  {
    limit = undefined,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryFileTimingOutput>> {
  const tableName = process.env.TABLE_FILE_TIMING;
  assert(tableName, 'TABLE_FILE_TIMING is not set');

  const {ConsumedCapacity: capacity, Items: items = []} =
    await ddbDocClient.send(
      new QueryCommand({
        ConsistentRead: false,
        ExpressionAttributeNames: {
          '#pk': makeEavPkForQueryFileTiming(input),
          '#sk': makeEavSkForQueryFileTiming(input),
        },
        ExpressionAttributeValues: {
          ':pk': makePartitionKeyForQueryFileTiming(input),
          ':sk': makeSortKeyForQueryFileTiming(input),
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
      assert(item._et === 'FileTiming', () => new DataIntegrityError('TODO'));
      return unmarshallFileTiming(item);
    }),
  };
}

/** queries the FileTiming table by primary key using a node id */
export async function queryFileTimingByNodeId(
  id: Scalars['ID']
): Promise<Readonly<Omit<ResultType<FileTiming>, 'metrics'>>> {
  const primaryKeyValues = Base64.decode(id)
    .split(':')
    .slice(1)
    .join(':')
    .split('#');

  const primaryKey: QueryFileTimingInput = {
    vendor: primaryKeyValues[1] as Vendor,
    repoId: primaryKeyValues[2],
    branchName: primaryKeyValues[3],
    label: primaryKeyValues[4],
  };

  if (typeof primaryKeyValues[2] !== 'undefined') {
    // @ts-ignore - TSC will usually see this as an error because it determined
    // that primaryKey is the no-sort-fields-specified version of the type.
    primaryKey.filename = primaryKeyValues[7];
  }

  const {capacity, items} = await queryFileTiming(primaryKey);

  assert(items.length > 0, () => new NotFoundError('FileTiming', primaryKey));
  assert(
    items.length < 2,
    () => new DataIntegrityError(`Found multiple FileTiming with id ${id}`)
  );

  return {capacity, item: items[0]};
}

export interface MarshallFileTimingOutput {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type MarshallFileTimingInput = Required<
  Pick<FileTiming, 'branchName' | 'duration' | 'filename' | 'repoId' | 'vendor'>
> &
  Partial<Pick<FileTiming, 'label' | 'version'>>;

/** Marshalls a DynamoDB record into a FileTiming object */
export function marshallFileTiming(
  input: MarshallFileTimingInput,
  now = new Date()
): MarshallFileTimingOutput {
  const updateExpression: string[] = [
    '#entity = :entity',
    '#branchName = :branchName',
    '#duration = :duration',
    '#filename = :filename',
    '#repoId = :repoId',
    '#updatedAt = :updatedAt',
    '#vendor = :vendor',
    '#version = :version',
    '#gsi2pk = :gsi2pk',
    '#gsi2sk = :gsi2sk',
    '#lsi1sk = :lsi1sk',
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
    '#pk': 'pk',
    '#branchName': 'branch_name',
    '#duration': 'duration',
    '#filename': 'filename',
    '#repoId': 'repo_id',
    '#updatedAt': '_md',
    '#vendor': 'vendor',
    '#version': '_v',
    '#gsi2pk': 'gsi2pk',
    '#gsi2sk': 'gsi2sk',
    '#lsi1sk': 'lsi1sk',
  };

  const eav: Record<string, unknown> = {
    ':entity': 'FileTiming',
    ':branchName': input.branchName,
    ':duration': input.duration,
    ':filename': input.filename,
    ':repoId': input.repoId,
    ':vendor': input.vendor,
    ':updatedAt': now.getTime(),
    ':version': ('version' in input ? input.version ?? 0 : 0) + 1,
    ':gsi2pk': `BRANCH#${input.vendor}#${input.repoId}#${input.branchName}`,
    ':gsi2sk': `FILE`,
    ':lsi1sk': `FILE#${input.duration}`,
  };

  if ('label' in input && typeof input.label !== 'undefined') {
    ean['#label'] = 'label';
    eav[':label'] = input.label;
    updateExpression.push('#label = :label');
  }
  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
  };
}

/** Unmarshalls a DynamoDB record into a FileTiming object */
export function unmarshallFileTiming(item: Record<string, any>): FileTiming {
  if ('branch_name' in item) {
    assert(
      item.branch_name !== null,
      () => new DataIntegrityError('Expected branchName to be non-null')
    );
    assert(
      typeof item.branch_name !== 'undefined',
      () => new DataIntegrityError('Expected branchName to be defined')
    );
  }
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
  if ('duration' in item) {
    assert(
      item.duration !== null,
      () => new DataIntegrityError('Expected duration to be non-null')
    );
    assert(
      typeof item.duration !== 'undefined',
      () => new DataIntegrityError('Expected duration to be defined')
    );
  }
  if ('filename' in item) {
    assert(
      item.filename !== null,
      () => new DataIntegrityError('Expected filename to be non-null')
    );
    assert(
      typeof item.filename !== 'undefined',
      () => new DataIntegrityError('Expected filename to be defined')
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
  if ('repo_id' in item) {
    assert(
      item.repo_id !== null,
      () => new DataIntegrityError('Expected repoId to be non-null')
    );
    assert(
      typeof item.repo_id !== 'undefined',
      () => new DataIntegrityError('Expected repoId to be defined')
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

  let result: FileTiming = {
    branchName: item.branch_name,
    createdAt: new Date(item._ct),
    duration: item.duration,
    filename: item.filename,
    id: Base64.encode(`FileTiming:${item.pk}#:#${item.sk}`),
    repoId: item.repo_id,
    updatedAt: new Date(item._md),
    vendor: item.vendor,
    version: item._v,
  };

  if ('label' in item) {
    result = {
      ...result,
      label: item.label,
    };
  }

  return result;
}
