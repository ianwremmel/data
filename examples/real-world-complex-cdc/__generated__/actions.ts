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

/** Possible case types for converting a fieldName to a DynamoDB column_name. */
export type ColumnCase = 'CAMEL_CASE' | 'SNAKE_CASE';

/** Configuration specific to a table dispatcher */
export interface DispatcherConfig {
  lambdaConfig?: InputMaybe<LambdaConfig>;
}

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

/** Supported Vendors */
export type Vendor = 'GITHUB';

/**
 * Automatically adds a column to enable optimistic locking. This field shouldn't
 * be manipulated directly, but may need to be passed around by the runtime in
 * order to make updates.
 */
export interface Versioned {
  version: Scalars['Int'];
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

  try {
    // Reminder: we use UpdateCommand rather than PutCommand because PutCommand
    // cannot return the newly written values.
    const commandInput: UpdateCommandInput = {
      ConditionExpression: 'attribute_not_exists(#pk)',
      ExpressionAttributeNames: {
        ...ExpressionAttributeNames,
        '#createdAt': '_ct',

        '#lsi1sk': 'lsi1sk',
        '#lsi2sk': 'lsi2sk',
      },
      ExpressionAttributeValues: {
        ...ExpressionAttributeValues,
        ':createdAt': now.getTime(),

        ':lsi1sk': ['INSTANCE', now.getTime()].join('#'),
        ':lsi2sk': ['INSTANCE', input.conclusion, now.getTime()].join('#'),
      },
      Key: {
        pk: [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
          input.lineage,
        ].join('#'),
        sk: ['INSTANCE', input.sha, input.retry].join('#'),
      },
      ReturnConsumedCapacity: 'INDEXES',
      ReturnItemCollectionMetrics: 'SIZE',
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: [
        ...UpdateExpression.split(', '),
        '#createdAt = :createdAt',

        '#lsi1sk = :lsi1sk',
        '#lsi2sk = :lsi2sk',
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
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new AlreadyExistsError('CaseInstance', {
        pk: [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
          input.lineage,
        ].join('#'),
        sk: ['INSTANCE', input.sha, input.retry].join('#'),
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

export type BlindWriteCaseInstanceInput = Omit<
  CaseInstance,
  'createdAt' | 'id' | 'updatedAt' | 'version'
> &
  Partial<Pick<CaseInstance, 'createdAt'>>;

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

    '#lsi1sk': 'lsi1sk',
    '#lsi2sk': 'lsi2sk',
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
    ':lsi2sk': [
      'INSTANCE',
      input.conclusion,
      'createdAt' in input && typeof input.createdAt !== 'undefined'
        ? input.createdAt.getTime()
        : now.getTime(),
    ].join('#'),
  };
  const ue = `${[
    ...UpdateExpression.split(', ').filter((e) => !e.startsWith('#version')),
    '#createdAt = if_not_exists(#createdAt, :createdAt)',

    '#lsi1sk = :lsi1sk',
    '#lsi2sk = :lsi2sk',
  ].join(', ')} ADD #version :one`;

  const commandInput: UpdateCommandInput = {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    Key: {
      pk: [
        'CASE',
        input.vendor,
        input.repoId,
        input.branchName,
        input.label,
        input.lineage,
      ].join('#'),
      sk: ['INSTANCE', input.sha, input.retry].join('#'),
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

export type DeleteCaseInstanceOutput = ResultType<void>;

/**  */
export async function deleteCaseInstance(
  input: CaseInstancePrimaryKey
): Promise<DeleteCaseInstanceOutput> {
  const tableName = process.env.TABLE_CASE_INSTANCE;
  assert(tableName, 'TABLE_CASE_INSTANCE is not set');

  try {
    const commandInput: DeleteCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      Key: {
        pk: [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
          input.lineage,
        ].join('#'),
        sk: ['INSTANCE', input.sha, input.retry].join('#'),
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
      throw new NotFoundError('CaseInstance', input);
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

export type ReadCaseInstanceOutput = ResultType<CaseInstance>;

/**  */
export async function readCaseInstance(
  input: CaseInstancePrimaryKey
): Promise<Readonly<ReadCaseInstanceOutput>> {
  const tableName = process.env.TABLE_CASE_INSTANCE;
  assert(tableName, 'TABLE_CASE_INSTANCE is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: false,
    Key: {
      pk: [
        'CASE',
        input.vendor,
        input.repoId,
        input.branchName,
        input.label,
        input.lineage,
      ].join('#'),
      sk: ['INSTANCE', input.sha, input.retry].join('#'),
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

    assert(item, () => new NotFoundError('CaseInstance', input));
    assert(
      item._et === 'CaseInstance',
      () =>
        new DataIntegrityError(
          `Expected ${JSON.stringify(
            input
          )} to load a CaseInstance but loaded ${item._et} instead`
        )
    );

    return {
      capacity,
      item: unmarshallCaseInstance(item),
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
        pk: [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
          input.lineage,
        ].join('#'),
        sk: ['INSTANCE', input.sha, input.retry].join('#'),
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

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
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
function makeEanForQueryCaseInstance(
  input: QueryCaseInstanceInput
): Record<string, string> {
  if ('index' in input) {
    if (input.index === 'gsi1') {
      return {'#pk': 'gsi1pk', '#sk': 'gsi1sk'};
    } else if (input.index === 'gsi2') {
      return {'#pk': 'gsi2pk', '#sk': 'gsi2sk'};
    } else if (input.index === 'lsi1') {
      return {'#pk': 'pk', '#sk': 'lsi1sk'};
    } else if (input.index === 'lsi2') {
      return {'#pk': 'pk', '#sk': 'lsi2sk'};
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {'#pk': 'pk', '#sk': 'sk'};
  }
}

/** helper */
function makeEavForQueryCaseInstance(
  input: QueryCaseInstanceInput
): Record<string, any> {
  if ('index' in input) {
    if (input.index === 'gsi1') {
      return {
        ':pk': [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
          input.sha,
        ].join('#'),
        ':sk': makeSortKeyForQuery('INSTANCE', ['lineage', 'retry'], input),
      };
    } else if (input.index === 'gsi2') {
      return {
        ':pk': ['CASE', input.vendor, input.repoId, input.branchName].join('#'),
        ':sk': makeSortKeyForQuery('INSTANCE', ['label', 'sha'], input),
      };
    } else if (input.index === 'lsi1') {
      return {
        ':pk': [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
          input.lineage,
        ].join('#'),
        ':sk': makeSortKeyForQuery('INSTANCE', ['createdAt'], input),
      };
    } else if (input.index === 'lsi2') {
      return {
        ':pk': [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
          input.lineage,
        ].join('#'),
        ':sk': makeSortKeyForQuery(
          'INSTANCE',
          ['conclusion', 'createdAt'],
          input
        ),
      };
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {
      ':pk': [
        'CASE',
        input.vendor,
        input.repoId,
        input.branchName,
        input.label,
        input.lineage,
      ].join('#'),
      ':sk': makeSortKeyForQuery('INSTANCE', ['sha', 'retry'], input),
    };
  }
}

/** helper */
function makeKceForQueryCaseInstance(
  input: QueryCaseInstanceInput,
  {operator}: Pick<QueryOptions, 'operator'>
): string {
  if ('index' in input) {
    if (input.index === 'gsi1') {
      return `#pk = :pk AND ${
        operator === 'begins_with'
          ? 'begins_with(#sk, :sk)'
          : `#sk ${operator} :sk`
      }`;
    } else if (input.index === 'gsi2') {
      return `#pk = :pk AND ${
        operator === 'begins_with'
          ? 'begins_with(#sk, :sk)'
          : `#sk ${operator} :sk`
      }`;
    } else if (input.index === 'lsi1') {
      return `#pk = :pk AND ${
        operator === 'begins_with'
          ? 'begins_with(#sk, :sk)'
          : `#sk ${operator} :sk`
      }`;
    } else if (input.index === 'lsi2') {
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

/** queryCaseInstance */
export async function queryCaseInstance(
  input: Readonly<QueryCaseInstanceInput>,
  {
    limit = undefined,
    nextToken,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryCaseInstanceOutput>> {
  const tableName = process.env.TABLE_CASE_INSTANCE;
  assert(tableName, 'TABLE_CASE_INSTANCE is not set');

  const ExpressionAttributeNames = makeEanForQueryCaseInstance(input);
  const ExpressionAttributeValues = makeEavForQueryCaseInstance(input);
  const KeyConditionExpression = makeKceForQueryCaseInstance(input, {operator});

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
          item._et === 'CaseInstance',
          () =>
            new DataIntegrityError(
              `Query result included at item with type ${item._et}. Only CaseInstance was expected.`
            )
        );
        return unmarshallCaseInstance(item);
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
    ':gsi1pk': [
      'CASE',
      input.vendor,
      input.repoId,
      input.branchName,
      input.label,
      input.sha,
    ].join('#'),
    ':gsi1sk': ['INSTANCE', input.lineage, input.retry].join('#'),
    ':gsi2pk': ['CASE', input.vendor, input.repoId, input.branchName].join('#'),
    ':gsi2sk': ['INSTANCE', input.label, input.sha].join('#'),
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
  let result: CaseInstance = {
    branchName: unmarshallRequiredField(item, 'branchName', [
      'branch_name',
      'branchName',
    ]),
    conclusion: unmarshallRequiredField(item, 'conclusion', [
      'conclusion',
      'conclusion',
    ]),
    createdAt: unmarshallRequiredField(
      item,
      'createdAt',
      ['_ct'],
      (v) => new Date(v)
    ),
    id: Base64.encode(`CaseInstance:${item.pk}#:#${item.sk}`),
    lineage: unmarshallRequiredField(item, 'lineage', ['lineage', 'lineage']),
    repoId: unmarshallRequiredField(item, 'repoId', ['repo_id', 'repoId']),
    retry: unmarshallRequiredField(item, 'retry', ['retry', 'retry']),
    sha: unmarshallRequiredField(item, 'sha', ['sha', 'sha']),
    updatedAt: unmarshallRequiredField(
      item,
      'updatedAt',
      ['_md'],
      (v) => new Date(v)
    ),
    vendor: unmarshallRequiredField(item, 'vendor', ['vendor', 'vendor']),
    version: unmarshallRequiredField(item, 'version', ['_v']),
  };

  if ('duration' in item || 'duration' in item) {
    result = {
      ...result,
      duration: unmarshallOptionalField(item, 'duration', [
        'duration',
        'duration',
      ]),
    };
  }
  if ('filename' in item || 'filename' in item) {
    result = {
      ...result,
      filename: unmarshallOptionalField(item, 'filename', [
        'filename',
        'filename',
      ]),
    };
  }
  if ('label' in item || 'label' in item) {
    result = {
      ...result,
      label: unmarshallOptionalField(item, 'label', ['label', 'label']),
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
        pk: [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
        ].join('#'),
        sk: ['SUMMARY', input.lineage].join('#'),
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
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new AlreadyExistsError('CaseSummary', {
        pk: [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
        ].join('#'),
        sk: ['SUMMARY', input.lineage].join('#'),
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

export type BlindWriteCaseSummaryInput = Omit<
  CaseSummary,
  'createdAt' | 'id' | 'updatedAt' | 'version'
> &
  Partial<Pick<CaseSummary, 'createdAt'>>;

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

  const commandInput: UpdateCommandInput = {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    Key: {
      pk: [
        'CASE',
        input.vendor,
        input.repoId,
        input.branchName,
        input.label,
      ].join('#'),
      sk: ['SUMMARY', input.lineage].join('#'),
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

export type DeleteCaseSummaryOutput = ResultType<void>;

/**  */
export async function deleteCaseSummary(
  input: CaseSummaryPrimaryKey
): Promise<DeleteCaseSummaryOutput> {
  const tableName = process.env.TABLE_CASE_SUMMARY;
  assert(tableName, 'TABLE_CASE_SUMMARY is not set');

  try {
    const commandInput: DeleteCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      Key: {
        pk: [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
        ].join('#'),
        sk: ['SUMMARY', input.lineage].join('#'),
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
      throw new NotFoundError('CaseSummary', input);
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

export type ReadCaseSummaryOutput = ResultType<CaseSummary>;

/**  */
export async function readCaseSummary(
  input: CaseSummaryPrimaryKey
): Promise<Readonly<ReadCaseSummaryOutput>> {
  const tableName = process.env.TABLE_CASE_SUMMARY;
  assert(tableName, 'TABLE_CASE_SUMMARY is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: false,
    Key: {
      pk: [
        'CASE',
        input.vendor,
        input.repoId,
        input.branchName,
        input.label,
      ].join('#'),
      sk: ['SUMMARY', input.lineage].join('#'),
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
        pk: [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
        ].join('#'),
        sk: ['SUMMARY', input.lineage].join('#'),
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

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
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
function makeEanForQueryCaseSummary(
  input: QueryCaseSummaryInput
): Record<string, string> {
  if ('index' in input) {
    if (input.index === 'lsi1') {
      return {'#pk': 'pk', '#sk': 'lsi1sk'};
    } else if (input.index === 'lsi2') {
      return {'#pk': 'pk', '#sk': 'lsi2sk'};
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {'#pk': 'pk', '#sk': 'sk'};
  }
}

/** helper */
function makeEavForQueryCaseSummary(
  input: QueryCaseSummaryInput
): Record<string, any> {
  if ('index' in input) {
    if (input.index === 'lsi1') {
      return {
        ':pk': [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
        ].join('#'),
        ':sk': makeSortKeyForQuery('SUMMARY', ['stability'], input),
      };
    } else if (input.index === 'lsi2') {
      return {
        ':pk': [
          'CASE',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
        ].join('#'),
        ':sk': makeSortKeyForQuery('SUMMARY', ['duration'], input),
      };
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {
      ':pk': [
        'CASE',
        input.vendor,
        input.repoId,
        input.branchName,
        input.label,
      ].join('#'),
      ':sk': makeSortKeyForQuery('SUMMARY', ['lineage'], input),
    };
  }
}

/** helper */
function makeKceForQueryCaseSummary(
  input: QueryCaseSummaryInput,
  {operator}: Pick<QueryOptions, 'operator'>
): string {
  if ('index' in input) {
    if (input.index === 'lsi1') {
      return `#pk = :pk AND ${
        operator === 'begins_with'
          ? 'begins_with(#sk, :sk)'
          : `#sk ${operator} :sk`
      }`;
    } else if (input.index === 'lsi2') {
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

/** queryCaseSummary */
export async function queryCaseSummary(
  input: Readonly<QueryCaseSummaryInput>,
  {
    limit = undefined,
    nextToken,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryCaseSummaryOutput>> {
  const tableName = process.env.TABLE_CASE_SUMMARY;
  assert(tableName, 'TABLE_CASE_SUMMARY is not set');

  const ExpressionAttributeNames = makeEanForQueryCaseSummary(input);
  const ExpressionAttributeValues = makeEavForQueryCaseSummary(input);
  const KeyConditionExpression = makeKceForQueryCaseSummary(input, {operator});

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
          item._et === 'CaseSummary',
          () =>
            new DataIntegrityError(
              `Query result included at item with type ${item._et}. Only CaseSummary was expected.`
            )
        );
        return unmarshallCaseSummary(item);
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
    ':lsi1sk': ['SUMMARY', input.stability].join('#'),
    ':lsi2sk': ['SUMMARY', input.duration].join('#'),
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
  let result: CaseSummary = {
    branchName: unmarshallRequiredField(item, 'branchName', [
      'branch_name',
      'branchName',
    ]),
    createdAt: unmarshallRequiredField(
      item,
      'createdAt',
      ['_ct'],
      (v) => new Date(v)
    ),
    duration: unmarshallRequiredField(item, 'duration', [
      'duration',
      'duration',
    ]),
    id: Base64.encode(`CaseSummary:${item.pk}#:#${item.sk}`),
    lineage: unmarshallRequiredField(item, 'lineage', ['lineage', 'lineage']),
    repoId: unmarshallRequiredField(item, 'repoId', ['repo_id', 'repoId']),
    stability: unmarshallRequiredField(item, 'stability', [
      'stability',
      'stability',
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

  if ('label' in item || 'label' in item) {
    result = {
      ...result,
      label: unmarshallOptionalField(item, 'label', ['label', 'label']),
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
        pk: [
          'TIMING',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
        ].join('#'),
        sk: ['FILE', input.filename].join('#'),
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
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new AlreadyExistsError('FileTiming', {
        pk: [
          'TIMING',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
        ].join('#'),
        sk: ['FILE', input.filename].join('#'),
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

export type BlindWriteFileTimingInput = Omit<
  FileTiming,
  'createdAt' | 'id' | 'updatedAt' | 'version'
> &
  Partial<Pick<FileTiming, 'createdAt'>>;

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

  const commandInput: UpdateCommandInput = {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    Key: {
      pk: [
        'TIMING',
        input.vendor,
        input.repoId,
        input.branchName,
        input.label,
      ].join('#'),
      sk: ['FILE', input.filename].join('#'),
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

export type DeleteFileTimingOutput = ResultType<void>;

/**  */
export async function deleteFileTiming(
  input: FileTimingPrimaryKey
): Promise<DeleteFileTimingOutput> {
  const tableName = process.env.TABLE_FILE_TIMING;
  assert(tableName, 'TABLE_FILE_TIMING is not set');

  try {
    const commandInput: DeleteCommandInput = {
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#pk': 'pk',
      },
      Key: {
        pk: [
          'TIMING',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
        ].join('#'),
        sk: ['FILE', input.filename].join('#'),
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
      throw new NotFoundError('FileTiming', input);
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

export type ReadFileTimingOutput = ResultType<FileTiming>;

/**  */
export async function readFileTiming(
  input: FileTimingPrimaryKey
): Promise<Readonly<ReadFileTimingOutput>> {
  const tableName = process.env.TABLE_FILE_TIMING;
  assert(tableName, 'TABLE_FILE_TIMING is not set');

  const commandInput: GetCommandInput = {
    ConsistentRead: false,
    Key: {
      pk: [
        'TIMING',
        input.vendor,
        input.repoId,
        input.branchName,
        input.label,
      ].join('#'),
      sk: ['FILE', input.filename].join('#'),
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
        pk: [
          'TIMING',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
        ].join('#'),
        sk: ['FILE', input.filename].join('#'),
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

    if (err instanceof AssertionError || err instanceof BaseDataLibraryError) {
      throw err;
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
function makeEanForQueryFileTiming(
  input: QueryFileTimingInput
): Record<string, string> {
  if ('index' in input) {
    if (input.index === 'gsi2') {
      return {'#pk': 'gsi2pk', '#sk': 'gsi2sk'};
    } else if (input.index === 'lsi1') {
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
function makeEavForQueryFileTiming(
  input: QueryFileTimingInput
): Record<string, any> {
  if ('index' in input) {
    if (input.index === 'gsi2') {
      return {
        ':pk': ['BRANCH', input.vendor, input.repoId, input.branchName].join(
          '#'
        ),
        ':sk': makeSortKeyForQuery('FILE', [], input),
      };
    } else if (input.index === 'lsi1') {
      return {
        ':pk': [
          'TIMING',
          input.vendor,
          input.repoId,
          input.branchName,
          input.label,
        ].join('#'),
        ':sk': makeSortKeyForQuery('FILE', ['duration'], input),
      };
    }
    throw new Error(
      'Invalid index. If TypeScript did not catch this, then this is a bug in codegen.'
    );
  } else {
    return {
      ':pk': [
        'TIMING',
        input.vendor,
        input.repoId,
        input.branchName,
        input.label,
      ].join('#'),
      ':sk': makeSortKeyForQuery('FILE', ['filename'], input),
    };
  }
}

/** helper */
function makeKceForQueryFileTiming(
  input: QueryFileTimingInput,
  {operator}: Pick<QueryOptions, 'operator'>
): string {
  if ('index' in input) {
    if (input.index === 'gsi2') {
      return `#pk = :pk AND ${
        operator === 'begins_with'
          ? 'begins_with(#sk, :sk)'
          : `#sk ${operator} :sk`
      }`;
    } else if (input.index === 'lsi1') {
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

/** queryFileTiming */
export async function queryFileTiming(
  input: Readonly<QueryFileTimingInput>,
  {
    limit = undefined,
    nextToken,
    operator = 'begins_with',
    reverse = false,
  }: QueryOptions = {}
): Promise<Readonly<QueryFileTimingOutput>> {
  const tableName = process.env.TABLE_FILE_TIMING;
  assert(tableName, 'TABLE_FILE_TIMING is not set');

  const ExpressionAttributeNames = makeEanForQueryFileTiming(input);
  const ExpressionAttributeValues = makeEavForQueryFileTiming(input);
  const KeyConditionExpression = makeKceForQueryFileTiming(input, {operator});

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
          item._et === 'FileTiming',
          () =>
            new DataIntegrityError(
              `Query result included at item with type ${item._et}. Only FileTiming was expected.`
            )
        );
        return unmarshallFileTiming(item);
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
    ':gsi2pk': ['BRANCH', input.vendor, input.repoId, input.branchName].join(
      '#'
    ),
    ':gsi2sk': ['FILE'].join('#'),
    ':lsi1sk': ['FILE', input.duration].join('#'),
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
  let result: FileTiming = {
    branchName: unmarshallRequiredField(item, 'branchName', [
      'branch_name',
      'branchName',
    ]),
    createdAt: unmarshallRequiredField(
      item,
      'createdAt',
      ['_ct'],
      (v) => new Date(v)
    ),
    duration: unmarshallRequiredField(item, 'duration', [
      'duration',
      'duration',
    ]),
    filename: unmarshallRequiredField(item, 'filename', [
      'filename',
      'filename',
    ]),
    id: Base64.encode(`FileTiming:${item.pk}#:#${item.sk}`),
    repoId: unmarshallRequiredField(item, 'repoId', ['repo_id', 'repoId']),
    updatedAt: unmarshallRequiredField(
      item,
      'updatedAt',
      ['_md'],
      (v) => new Date(v)
    ),
    vendor: unmarshallRequiredField(item, 'vendor', ['vendor', 'vendor']),
    version: unmarshallRequiredField(item, 'version', ['_v']),
  };

  if ('label' in item || 'label' in item) {
    result = {
      ...result,
      label: unmarshallOptionalField(item, 'label', ['label', 'label']),
    };
  }

  return result;
}
