import type {PrimaryKeyConfig, Model} from '../../parser';

import {blindWriteTpl} from './templates/blind-write';
import {createItemTpl} from './templates/create-item';
import {deleteItemTpl} from './templates/delete-item';
import {makeKeyTemplate, objectToString} from './templates/helpers';
import {queryTpl} from './templates/query';
import {readItemTpl} from './templates/read-item';
import {touchItemTpl} from './templates/touch-item';
import {updateItemTpl} from './templates/update-item';

/**
 * Generates the createItem function for a table
 */
export function createItemTemplate(model: Model) {
  return createItemTpl({
    fields: model.fields,
    hasPublicId: model.isPublicModel,
    key: makeKey(model.primaryKey),
    model,
    tableName: model.tableName,
    ttlConfig: model.ttlConfig,
    typeName: model.typeName,
  });
}

/**
 * Generates the createItem function for a table
 */
export function blindWriteTemplate(model: Model) {
  return blindWriteTpl({
    fields: model.fields,
    hasPublicId: model.isPublicModel,
    key: makeKeyForBlind(model.primaryKey),
    model,
    tableName: model.tableName,
    ttlConfig: model.ttlConfig,
    typeName: model.typeName,
  });
}

/**
 * Generates the deleteItem function for a table
 */
export function deleteItemTemplate(model: Model) {
  return deleteItemTpl({
    key: makeKeyForRead(model.primaryKey),
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
export function readItemTemplate(model: Model) {
  return readItemTpl({
    consistent: model.consistent,
    key: makeKeyForRead(model.primaryKey),
    tableName: model.tableName,
    typeName: model.typeName,
  });
}

/**
 * Generates the updateItem function for a table
 */
export function touchItemTemplate(model: Model) {
  const ean: string[] = [];
  const eav: string[] = [];
  const updateExpressions: string[] = [];

  for (const {fieldName} of model.fields) {
    if (fieldName === 'id') {
      continue;
    } else if (fieldName === 'version') {
      ean.push(`'#version': '_v'`);
      eav.push(`':versionInc': 1`);
      updateExpressions.push(`#version = #version + :versionInc`);
    } else if (
      fieldName === model.ttlConfig?.fieldName &&
      model.ttlConfig.duration
    ) {
      ean.push(`'#${fieldName}': 'ttl'`);
      eav.push(`':ttlInc': ${model.ttlConfig.duration}`);
      updateExpressions.push(`#${fieldName} = #${fieldName} + :ttlInc`);
    }
  }

  ean.push("'#pk': 'pk'");

  ean.sort();
  eav.sort();
  updateExpressions.sort();

  return touchItemTpl({
    ean,
    eav,
    key: makeKeyForBlind(model.primaryKey),
    tableName: model.tableName,
    typeName: model.typeName,
    updateExpressions,
  });
}

/**
 * Generates the updateItem function for a table
 */
export function updateItemTemplate(model: Model) {
  return updateItemTpl({
    fields: model.fields,
    hasPublicId: model.isPublicModel,
    key: makeKeyForRead(model.primaryKey),
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
function makeKey(key: PrimaryKeyConfig): Record<string, string> {
  if (key.isComposite) {
    return {
      pk: `\`${makeKeyTemplate(
        key.partitionKeyPrefix,
        key.partitionKeyFields,
        'create'
      )}\``,
      sk: `\`${makeKeyTemplate(
        key.sortKeyPrefix,
        key.sortKeyFields,
        'create'
      )}\``,
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
function makeKeyForBlind(key: PrimaryKeyConfig): Record<string, string> {
  if (key.isComposite) {
    return {
      pk: `\`${makeKeyTemplate(
        key.partitionKeyPrefix,
        key.partitionKeyFields,
        'blind'
      )}\``,
      sk: `\`${makeKeyTemplate(
        key.sortKeyPrefix,
        key.sortKeyFields,
        'blind'
      )}\``,
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
function makeKeyForRead(key: PrimaryKeyConfig): Record<string, string> {
  if (key.isComposite) {
    return {
      pk: `\`${makeKeyTemplate(
        key.partitionKeyPrefix,
        key.partitionKeyFields,
        'read'
      )}\``,
      sk: `\`${makeKeyTemplate(
        key.sortKeyPrefix,
        key.sortKeyFields,
        'read'
      )}\``,
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
