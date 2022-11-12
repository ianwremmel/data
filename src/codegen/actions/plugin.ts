import assert from 'assert';
import {readFileSync} from 'fs';
import path from 'path';

import {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';
import {assertObjectType, GraphQLObjectType, isObjectType} from 'graphql';

import {hasDirective, hasInterface} from '../common/helpers';
import {extractKeyInfo} from '../common/keys';

import {ActionPluginConfig} from './config';
import {
  createItemTemplate,
  deleteItemTemplate,
  queryTemplate,
  readItemTemplate,
  touchItemTemplate,
  updateItemTemplate,
} from './tables/table';
import {queryTpl} from './tables/templates/query';

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
  try {
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

export interface MultiResultType<T> {
  capacity: ConsumedCapacity;
  items: T[];
}


${tableTypes
  .map((objType) => {
    const keyInfo = extractKeyInfo(objType);

    return [
      `export interface ${objType.name}PrimaryKey {
          ${keyInfo.primaryKeyType.join('\n')}
        }`,
      createItemTemplate(objType),
      deleteItemTemplate(objType),
      readItemTemplate(objType),
      touchItemTemplate(objType),
      updateItemTemplate(objType),
      queryTemplate(objType),
    ]
      .filter(Boolean)
      .join('\n\n');
  })
  .join('\n')}`;

    assert(info?.outputFile, 'info.outputFile is required');

    const isExample = !!process.env.IS_EXAMPLE;
    const runtimeModuleId = isExample ? '../../..' : '@ianwremmel/data';

    return {
      content,
      prepend: [
        `import {ConditionalCheckFailedException, ConsumedCapacity, ItemCollectionMetrics} from '@aws-sdk/client-dynamodb';`,
        `import {DeleteCommand, GetCommand, QueryCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb'`,
        `import {assert, DataIntegrityError, NotFoundError, OptimisticLockingError} from '${runtimeModuleId}'`,
        `import {v4 as uuidv4} from 'uuid'`,
        `import {ddbDocClient} from "${path.relative(
          path.resolve(process.cwd(), path.dirname(info.outputFile)),
          path.resolve(process.cwd(), config.pathToDocumentClient)
        )}"`,
      ],
    };
  } catch (err) {
    // graphql-codegen suppresses stack traces, so we have to re-log here.
    console.error(err);
    throw err;
  }
};
