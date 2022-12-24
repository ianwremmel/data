import assert from 'assert';
import {readFileSync} from 'fs';
import path from 'path';

import type {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';

import {parse} from '../parser';

import type {ActionPluginConfig} from './config';
import {
  blindWriteTemplate,
  createItemTemplate,
  deleteItemTemplate,
  queryTemplate,
  readItemTemplate,
  touchItemTemplate,
  updateItemTemplate,
} from './tables/table';
import {
  getTypeScriptTypeForField,
  objectToString,
} from './tables/templates/helpers';
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
    const {tables, models} = parse(schema, documents, config, info);
    const content = `export interface ResultType<T> {
  capacity: ConsumedCapacity;
  item: T;
  metrics: ItemCollectionMetrics | undefined;
}

export interface MultiResultType<T> {
  capacity: ConsumedCapacity;
  items: T[];
}

${models
  .map((table) => {
    return [
      `export interface ${table.typeName}PrimaryKey ${objectToString(
        Object.fromEntries(
          (table.primaryKey.isComposite
            ? [
                ...table.primaryKey.partitionKeyFields,
                ...table.primaryKey.sortKeyFields,
              ]
            : table.primaryKey.partitionKeyFields
          )
            .map(getTypeScriptTypeForField)
            .sort()
        )
      )}`,
      createItemTemplate(table),
      blindWriteTemplate(table),
      deleteItemTemplate(table),
      readItemTemplate(table),
      touchItemTemplate(table),
      updateItemTemplate(table),
      queryTemplate(table),
      marshallTpl({table}),
      unmarshallTpl({table}),
    ]
      .filter(Boolean)
      .join('\n\n');
  })
  .join('\n')}`;

    assert(info?.outputFile, 'info.outputFile is required');

    const runtimeModuleId = '@ianwremmel/data';

    const hasPublicModels = tables.some((table) => table.hasPublicModels);

    const importFromDependencies = [
      'ddbDocClient',
      hasPublicModels && 'idGenerator',
    ]
      .filter(Boolean)
      .join(', ');

    return {
      content,
      prepend: [
        `import {ConditionalCheckFailedException, ConsumedCapacity, ItemCollectionMetrics} from '@aws-sdk/client-dynamodb';`,
        `import {ServiceException} from '@aws-sdk/smithy-client';`,
        `import {DeleteCommand, GetCommand, QueryCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb';`,
        `import Base64 from 'base64url';`,
        `import {assert, DataIntegrityError, NotFoundError, OptimisticLockingError, UnexpectedAwsError, UnexpectedError} from '${runtimeModuleId}';`,
        `import {NativeAttributeValue} from '@aws-sdk/util-dynamodb/dist-types/models';`,
        `import {${importFromDependencies}} from "${resolveDependenciesPath(
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
