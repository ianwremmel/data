import assert from 'assert';
import {readFileSync} from 'fs';
import path from 'path';

import type {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';
import type {GraphQLObjectType} from 'graphql';
import {assertObjectType, isObjectType} from 'graphql';

import {hasInterface} from '../common/helpers';
import {extractKeyInfo} from '../common/keys';

import type {ActionPluginConfig} from './config';
import {
  createItemTemplate,
  deleteItemTemplate,
  queryTemplate,
  readItemTemplate,
  touchItemTemplate,
  updateItemTemplate,
} from './tables/table';
import {marshallTpl} from './tables/templates/marshall';
import {unmarshallTpl} from './tables/templates/unmarshall';

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
      marshallTpl({objType}),
      unmarshallTpl({objType}),
    ]
      .filter(Boolean)
      .join('\n\n');
  })
  .join('\n')}`;

    assert(info?.outputFile, 'info.outputFile is required');

    const runtimeModuleId = '@ianwremmel/data';

    return {
      content,
      prepend: [
        `import {ConditionalCheckFailedException, ConsumedCapacity, ItemCollectionMetrics} from '@aws-sdk/client-dynamodb';`,
        `import {DeleteCommand, GetCommand, QueryCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb';`,
        `import Base64 from 'base64url';`,
        `import {assert, DataIntegrityError, NotFoundError, OptimisticLockingError} from '${runtimeModuleId}';`,
        `import {NativeAttributeValue} from '@aws-sdk/util-dynamodb/dist-types/models';`,
        `import {ddbDocClient} from "${resolveDependenciesPath(
          info.outputFile,
          config.dependenciesModuleId
        )}";`,
        `export interface QueryOptions {
  limit?: number;
  /**
   * All operators supported by DynamoDB are except \`between\`. \`between\` is
   * not supported because it requires two values and that makes the codegen
   * quite a bit more tedious. If it's needed, please open a ticket and we can
   * look into adding it.
   */
  operator?: 'begins_with' | '=' | '<' | '<=' | '>' | '>=';
  reverse?: boolean;
}`,
      ],
    };
  } catch (err) {
    // graphql-codegen suppresses stack traces, so we have to re-log here.
    console.error(err);
    throw err;
  }
};

/** helper */
function resolveDependenciesPath(outputFile: string, depsModuleId: string) {
  if (depsModuleId.startsWith('.')) {
    const fullPathToOutputFile = path.resolve(
      process.cwd(),
      path.dirname(outputFile)
    );
    const fullPathToDependenciesFile = path.resolve(
      process.cwd(),
      depsModuleId
    );
    return path.relative(fullPathToOutputFile, fullPathToDependenciesFile);
  }
  return depsModuleId;
}
