import assert from 'assert';
import {readFileSync} from 'fs';
import path from 'path';

import type {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';

import {filterNull} from '../common/filters';
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
    const {dependenciesModuleId, tables, models} = parse(
      schema,
      documents,
      config,
      info
    );
    const content = `

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
      !table.isLedger && blindWriteTemplate(table),
      !table.isLedger && deleteItemTemplate(table),
      readItemTemplate(table),
      !table.isLedger && touchItemTemplate(table),
      !table.isLedger && updateItemTemplate(table),
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
      .filter(filterNull)
      .join(', ');

    return {
      content,
      prepend: [
        `import {ConditionalCheckFailedException, ConsumedCapacity, ItemCollectionMetrics} from '@aws-sdk/client-dynamodb';`,
        `import {
          DeleteCommand,
          DeleteCommandInput,
          GetCommand,
          GetCommandInput,
          QueryCommand,
          QueryCommandInput,
          UpdateCommand,
          UpdateCommandInput
        } from '@aws-sdk/lib-dynamodb';`,
        `import {ServiceException} from '@aws-sdk/smithy-client';`,
        `import {NativeAttributeValue} from '@aws-sdk/util-dynamodb';`,
        `import Base64 from 'base64url';`,
        `import {assert, DataIntegrityError, MultiResultType, NotFoundError, OptimisticLockingError, ResultType, QueryOptions, UnexpectedAwsError, UnexpectedError} from '${runtimeModuleId}';`,
        `import {${importFromDependencies}} from "${dependenciesModuleId}";`,
      ],
    };
  } catch (err) {
    // graphql-codegen suppresses stack traces, so we have to re-log here.
    console.error(err);
    throw err;
  }
};
