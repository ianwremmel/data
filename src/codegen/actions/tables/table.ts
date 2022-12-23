import type {PrimaryKeyConfig, Table} from '../../parser';

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
export function createItemTemplate(irTable: Table) {
  return createItemTpl({
    key: makeKey(irTable.primaryKey),
    omit: ['id', irTable.ttlConfig?.fieldName ?? ''].filter(Boolean),
    tableName: irTable.tableName,
    ttlConfig: irTable.ttlConfig,
    typeName: irTable.typeName,
  });
}

/**
 * Generates the createItem function for a table
 */
export function blindWriteTemplate(irTable: Table) {
  return blindWriteTpl({
    key: makeKey(irTable.primaryKey),
    tableName: irTable.tableName,
    ttlConfig: irTable.ttlConfig,
    typeName: irTable.typeName,
  });
}

/**
 * Generates the deleteItem function for a table
 */
export function deleteItemTemplate(irTable: Table) {
  return deleteItemTpl({
    key: makeKey(irTable.primaryKey),
    tableName: irTable.tableName,
    typeName: irTable.typeName,
  });
}

/**
 * Generates the query function for a table
 */
export function queryTemplate(irTable: Table) {
  if (!irTable.primaryKey.isComposite) {
    return '';
  }

  return queryTpl({
    consistent: irTable.consistent,
    primaryKey: irTable.primaryKey,
    secondaryIndexes: irTable.secondaryIndexes,
    tableName: irTable.tableName,
    typeName: irTable.typeName,
  });
}

/**
 * Generates the readItem function for a table
 */
export function readItemTemplate(irTable: Table) {
  return readItemTpl({
    consistent: irTable.consistent,
    key: makeKey(irTable.primaryKey),
    tableName: irTable.tableName,
    typeName: irTable.typeName,
  });
}

/**
 * Generates the updateItem function for a table
 */
export function touchItemTemplate(irTable: Table) {
  const ean: string[] = [];
  const eav: string[] = [];
  const updateExpressions: string[] = [];

  for (const {fieldName} of irTable.fields) {
    if (fieldName === 'id') {
      continue;
    } else if (fieldName === 'version') {
      ean.push(`'#version': '_v'`);
      eav.push(`':versionInc': 1`);
      updateExpressions.push(`#version = #version + :versionInc`);
    } else if (
      fieldName === irTable.ttlConfig?.fieldName &&
      irTable.ttlConfig.duration
    ) {
      ean.push(`'#${fieldName}': 'ttl'`);
      eav.push(`':ttlInc': ${irTable.ttlConfig.duration}`);
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
    key: makeKey(irTable.primaryKey),
    tableName: irTable.tableName,
    typeName: irTable.typeName,
    updateExpressions,
  });
}

/**
 * Generates the updateItem function for a table
 */
export function updateItemTemplate(irTable: Table) {
  return updateItemTpl({
    key: makeKey(irTable.primaryKey),
    marshallPrimaryKey: objectToString(
      Object.fromEntries(
        (irTable.primaryKey.isComposite
          ? [
              ...irTable.primaryKey.partitionKeyFields,
              ...irTable.primaryKey.sortKeyFields,
            ]
          : irTable.primaryKey.partitionKeyFields
        )
          .map(({fieldName}) => fieldName)
          .sort()
          .map((fieldName) => [fieldName, `input.${fieldName}`])
      )
    ),
    tableName: irTable.tableName,
    ttlConfig: irTable.ttlConfig,
    typeName: irTable.typeName,
  });
}

/** helper */
function makeKey(key: PrimaryKeyConfig): Record<string, string> {
  if (key.isComposite) {
    return {
      pk: `\`${makeKeyTemplate(
        key.partitionKeyPrefix,
        key.partitionKeyFields
      )}\``,
      sk: `\`${makeKeyTemplate(key.sortKeyPrefix, key.sortKeyFields)}\``,
    };
  }

  return {
    pk: `\`${makeKeyTemplate(
      key.partitionKeyPrefix,
      key.partitionKeyFields
    )}\``,
  };
}
