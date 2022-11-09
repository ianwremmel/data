import assert from 'assert';
import {readFileSync} from 'fs';
import path from 'path';

import {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';
import {assertObjectType, GraphQLObjectType, isObjectType} from 'graphql';

import {hasInterface} from '../common/helpers';

import {ActionPluginConfig} from './config';
import {
  createItemTemplate,
  deleteItemTemplate,
  readItemTemplate,
  touchItemTemplate,
  updateItemTemplate,
} from './tables/table';

/** @override */
export function addToSchema(): AddToSchemaResult {
  return readFileSync(path.resolve(__dirname, '../schema.graphqls'), 'utf8');
}

/** @override */
export const plugin: PluginFunction<ActionPluginConfig> = (
  schema,
  documents,
  config,
  info
) => {
  const typesMap = schema.getTypeMap();

  const tableTypes = Object.keys(typesMap)
    .filter((typeName) => {
      const type = typesMap[typeName];
      return isObjectType(type) && hasInterface('Model', type);
    })
    .map((typeName) => {
      const objType = typesMap[typeName];
      assertObjectType(objType);
      return objType as GraphQLObjectType;
    });

  const content = `export interface ResultType<T> {
  capacity: ConsumedCapacity;
  item: T;
  metrics: ItemCollectionMetrics | undefined;
}

${tableTypes
  .map((objType) =>
    [
      `export interface ${objType.name}PrimaryKey {
        id: Scalars['ID'];
      }`,
      createItemTemplate(objType),
      deleteItemTemplate(objType),
      readItemTemplate(objType),
      touchItemTemplate(objType),
      updateItemTemplate(objType),
    ].join('\n\n')
  )
  .join('\n')}`;

  assert(info?.outputFile, 'info.outputFile is required');

  const isExample = !!process.env.IS_EXAMPLE;

  return {
    content,
    prepend: [
      `import {ConditionalCheckFailedException, ConsumedCapacity, ItemCollectionMetrics} from '@aws-sdk/client-dynamodb';`,
      `import {DeleteCommand, GetCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb'`,
      isExample
        ? `import {assert, DataIntegrityError, NotFoundError, OptimisticLockingError} from '../../..'`
        : `import {assert, DataIntegrityError, NotFoundError, OptimisticLockingError} from '@ianwremmel/data'`,
      `import {v4 as uuidv4} from 'uuid'`,
      `import {ddbDocClient} from "${path.relative(
        path.resolve(process.cwd(), path.dirname(info.outputFile)),
        path.resolve(process.cwd(), config.pathToDocumentClient)
      )}"`,
    ],
  };
};