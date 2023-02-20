import assert from 'assert';
import {readFileSync} from 'fs';
import path from 'path';

import type {
  AddToSchemaResult,
  PluginFunction,
} from '@graphql-codegen/plugin-helpers';

import {
  defaultDispatcherConfig,
  defaultHandlerConfig,
} from '../common-plugin-config';
import {filterNull} from '../common/filters';
import {parse} from '../parser';

import type {ActionPluginConfig} from './config';
import {
  blindWriteTemplate,
  createItemTemplate,
  deleteItemTemplate,
  queryTemplate,
  readItemTemplate,
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
    const {additionalImports, dependenciesModuleId, tables, models} = parse(
      schema,
      documents,
      {
        ...config,
        defaultDispatcherConfig: {
          ...defaultDispatcherConfig,
          ...config.defaultDispatcherConfig,
        },
        defaultHandlerConfig: {
          ...defaultHandlerConfig,
          ...config.defaultHandlerConfig,
        },
      },
      info
    );
    const content = `


${models
  .map((model) => {
    const hasPublicIdInPrimaryKey =
      model.primaryKey.partitionKeyFields.some(
        (field) => field.fieldName === 'publicId'
      ) ||
      ('sortKeyFields' in model.primaryKey
        ? model.primaryKey.sortKeyFields.some(
            (field) => field.fieldName === 'publicId'
          )
        : false);

    if (hasPublicIdInPrimaryKey) {
      console.warn(
        `Model ${model.typeName} has a publicId in its primary key and therefore blindWrite is not supported.`
      );
    }

    return [
      `export interface ${model.typeName}PrimaryKey ${objectToString(
        Object.fromEntries(
          (model.primaryKey.isComposite
            ? [
                ...model.primaryKey.partitionKeyFields,
                ...model.primaryKey.sortKeyFields,
              ]
            : model.primaryKey.partitionKeyFields
          )
            .map(getTypeScriptTypeForField)
            .sort()
        )
      )}`,
      createItemTemplate(model, config),
      !model.isLedger &&
        !hasPublicIdInPrimaryKey &&
        blindWriteTemplate(model, config),
      !model.isLedger && deleteItemTemplate(model, config),
      readItemTemplate(model, config),
      !model.isLedger && updateItemTemplate(model, config),
      queryTemplate(model),
      marshallTpl({model}),
      unmarshallTpl({model}),
    ]
      .filter(filterNull)
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
        `import {
          assert,
          makeSortKeyForQuery,
          unmarshallRequiredField,
          unmarshallOptionalField,
          AlreadyExistsError,
          AssertionError,
          BaseDataLibraryError,
          DataIntegrityError,
          MultiResultType,
          NotFoundError,
          OptimisticLockingError,
          ResultType,
          QueryOptions,
          UnexpectedAwsError,
          UnexpectedError
        } from '${runtimeModuleId}';`,
        `import {${importFromDependencies}} from "${dependenciesModuleId}";`,
        ...additionalImports.map(
          ({importName, importPath}) =>
            `import {${importName}} from '${importPath}';`
        ),
      ],
    };
  } catch (err) {
    // graphql-codegen suppresses stack traces, so we have to re-log here.
    console.error(err);
    throw err;
  }
};
