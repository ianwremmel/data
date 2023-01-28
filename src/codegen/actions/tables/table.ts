import type {PrimaryKeyConfig, Model} from '../../parser';
import type {ActionPluginConfig} from '../config';

import {blindWriteTpl} from './templates/blind-write';
import {createItemTpl} from './templates/create-item';
import {deleteItemTpl} from './templates/delete-item';
import {makeKeyTemplate, objectToString} from './templates/helpers';
import {queryTpl} from './templates/query';
import {readItemTpl} from './templates/read-item';
import {updateItemTpl} from './templates/update-item';

/**
 * Generates the createItem function for a table
 */
export function createItemTemplate(model: Model, config: ActionPluginConfig) {
  return createItemTpl({
    fields: model.fields,
    hasPublicId: model.isPublicModel,
    key: makeKey(model.primaryKey, config),
    model,
    tableName: model.tableName,
    ttlConfig: model.ttlConfig,
    typeName: model.typeName,
  });
}

/**
 * Generates the createItem function for a table
 */
export function blindWriteTemplate(model: Model, config: ActionPluginConfig) {
  return blindWriteTpl({
    fields: model.fields,
    hasPublicId: model.isPublicModel,
    key: makeKeyForBlind(model.primaryKey, config),
    model,
    tableName: model.tableName,
    ttlConfig: model.ttlConfig,
    typeName: model.typeName,
  });
}

/**
 * Generates the deleteItem function for a table
 */
export function deleteItemTemplate(model: Model, config: ActionPluginConfig) {
  return deleteItemTpl({
    key: makeKeyForRead(model.primaryKey, config),
    tableName: model.tableName,
    typeName: model.typeName,
  });
}

/**
 * Generates the query function for a table
 */
export function queryTemplate(model: Model) {
  let isQueryable = false;
  if (model.primaryKey.isComposite) {
    isQueryable = true;
  }
  if (model.secondaryIndexes.length > 0) {
    isQueryable = true;
  }

  if (!isQueryable) {
    return '';
  }

  return queryTpl({
    consistent: model.consistent,
    isPublicModel: model.isPublicModel,
    primaryKey: model.primaryKey,
    secondaryIndexes: model.secondaryIndexes,
    tableName: model.tableName,
    typeName: model.typeName,
  });
}

/**
 * Generates the readItem function for a table
 */
export function readItemTemplate(model: Model, config: ActionPluginConfig) {
  return readItemTpl({
    consistent: model.consistent,
    key: makeKeyForRead(model.primaryKey, config),
    tableName: model.tableName,
    typeName: model.typeName,
  });
}

/**
 * Generates the updateItem function for a table
 */
export function updateItemTemplate(model: Model, config: ActionPluginConfig) {
  return updateItemTpl({
    fields: model.fields,
    hasPublicId: model.isPublicModel,
    key: makeKeyForRead(model.primaryKey, config),
    marshallPrimaryKey: objectToString(
      Object.fromEntries(
        (model.primaryKey.isComposite
          ? [
              ...model.primaryKey.partitionKeyFields,
              ...model.primaryKey.sortKeyFields,
            ]
          : model.primaryKey.partitionKeyFields
        )
          .map(({fieldName}) => fieldName)
          .sort()
          .map((fieldName) => [fieldName, `input.${fieldName}`])
      )
    ),
    model,
    primaryKeyFields: (model.primaryKey.isComposite
      ? [
          ...model.primaryKey.partitionKeyFields,
          ...model.primaryKey.sortKeyFields,
        ]
      : model.primaryKey.partitionKeyFields
    ).map(({fieldName}) => fieldName),
    tableName: model.tableName,
    ttlConfig: model.ttlConfig,
    typeName: model.typeName,
  });
}

/** helper */
function makeKey(
  key: PrimaryKeyConfig,
  config: ActionPluginConfig
): Record<string, string> {
  if (key.isComposite) {
    const doLegacy =
      config.legacyEmptySortFieldBehavior && key.sortKeyFields.length === 0;
    return {
      pk: `\`${makeKeyTemplate(
        key.partitionKeyPrefix,
        key.partitionKeyFields,
        'create'
      )}\``,
      sk: `\`${
        doLegacy
          ? `${key.sortKeyPrefix}#0`
          : makeKeyTemplate(key.sortKeyPrefix, key.sortKeyFields, 'create')
      }\``,
    };
  }

  return {
    pk: `\`${makeKeyTemplate(
      key.partitionKeyPrefix,
      key.partitionKeyFields,
      'create'
    )}\``,
  };
}

/** helper */
function makeKeyForBlind(
  key: PrimaryKeyConfig,
  config: ActionPluginConfig
): Record<string, string> {
  if (key.isComposite) {
    const doLegacy =
      config.legacyEmptySortFieldBehavior && key.sortKeyFields.length === 0;
    return {
      pk: `\`${makeKeyTemplate(
        key.partitionKeyPrefix,
        key.partitionKeyFields,
        'blind'
      )}\``,
      sk: `\`${
        doLegacy
          ? `${key.sortKeyPrefix}#0`
          : makeKeyTemplate(key.sortKeyPrefix, key.sortKeyFields, 'blind')
      }\``,
    };
  }

  return {
    pk: `\`${makeKeyTemplate(
      key.partitionKeyPrefix,
      key.partitionKeyFields,
      'blind'
    )}\``,
  };
}

/** helper */
function makeKeyForRead(
  key: PrimaryKeyConfig,
  config: ActionPluginConfig
): Record<string, string> {
  if (key.isComposite) {
    const doLegacy =
      config.legacyEmptySortFieldBehavior && key.sortKeyFields.length === 0;
    return {
      pk: `\`${makeKeyTemplate(
        key.partitionKeyPrefix,
        key.partitionKeyFields,
        'read'
      )}\``,
      sk: `\`${
        doLegacy
          ? `${key.sortKeyPrefix}#0`
          : makeKeyTemplate(key.sortKeyPrefix, key.sortKeyFields, 'read')
      }\``,
    };
  }

  return {
    pk: `\`${makeKeyTemplate(
      key.partitionKeyPrefix,
      key.partitionKeyFields,
      'read'
    )}\``,
  };
}
