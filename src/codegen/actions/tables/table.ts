import type {GraphQLObjectType} from 'graphql';

import {hasDirective} from '../../common/helpers';
import type {IndexFieldInfo} from '../../common/indexes';
import {extractIndexInfo} from '../../common/indexes';
import {extractKeyInfo, makeKeyTemplate} from '../../common/keys';
import type {PrimaryKeyConfig, Table} from '../../parser';

import {createItemTpl} from './templates/create-item';
import {deleteItemTpl} from './templates/delete-item';
import {queryTpl} from './templates/query';
import {readItemTpl} from './templates/read-item';
import {touchItemTpl} from './templates/touch-item';
import {updateItemTpl} from './templates/update-item';

/**
 * Generates the createItem function for a table
 */
export function createItemTemplate(objType: GraphQLObjectType, irTable: Table) {
  return createItemTpl({
    key: makeKey(irTable.primaryKey),
    omit: ['id', irTable.ttlConfig?.fieldName ?? ''].filter(Boolean),
    tableName: irTable.tableName,
    typeName: irTable.typeName,
  });
}

/**
 * Generates the deleteItem function for a table
 */
export function deleteItemTemplate(objType: GraphQLObjectType, irTable: Table) {
  const keyInfo = extractKeyInfo(objType);

  return deleteItemTpl({
    ean: keyInfo.ean,
    key: makeKey(irTable.primaryKey),
    tableName: irTable.tableName,
    typeName: irTable.typeName,
  });
}

/**
 * Generates the query function for a table
 */
export function queryTemplate(objType: GraphQLObjectType, irTable: Table) {
  const indexInfo = extractIndexInfo(objType);
  const keyInfo = extractKeyInfo(objType);

  if (!hasDirective('compositeKey', objType)) {
    return '';
  }

  const consistent = hasDirective('consistent', objType);

  return queryTpl({
    consistent,
    indexes: [keyInfo.index, ...indexInfo.indexes].filter(
      Boolean
    ) as IndexFieldInfo[],
    tableName: irTable.tableName,
    typeName: irTable.typeName,
  });
}

/**
 * Generates the readItem function for a table
 */
export function readItemTemplate(objType: GraphQLObjectType, irTable: Table) {
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
export function touchItemTemplate(objType: GraphQLObjectType, irTable: Table) {
  const keyInfo = extractKeyInfo(objType);

  const ean: string[] = [];
  const eav: string[] = [];
  const updateExpressions: string[] = [];

  const fieldNames = Object.keys(objType.getFields()).sort();

  for (const fieldName of fieldNames) {
    if (keyInfo.fields.has(fieldName)) {
      // intentionally empty. if key fields need to do anything, they'll be
      // handled after the loop
    } else if (fieldName === 'version') {
      ean.push(`'#version': '_v'`);
      eav.push(`':versionInc': 1`);
      updateExpressions.push(`#version = #version + :versionInc`);
    } else if (fieldName === irTable.ttlConfig?.fieldName) {
      ean.push(`'#${fieldName}': 'ttl'`);
      eav.push(`':ttlInc': ${irTable.ttlConfig.duration}`);
      updateExpressions.push(`#${fieldName} = #${fieldName} + :ttlInc`);
    }
  }

  ean.push(...keyInfo.ean);

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
export function updateItemTemplate(objType: GraphQLObjectType, irTable: Table) {
  const keyInfo = extractKeyInfo(objType);

  return updateItemTpl({
    inputToPrimaryKey: keyInfo.inputToPrimaryKey,
    key: makeKey(irTable.primaryKey),
    tableName: irTable.tableName,
    ttlInfo: irTable.ttlConfig,
    typeName: irTable.typeName,
  });
}

/** helper */
function makeKey(key: PrimaryKeyConfig): Record<string, string> {
  if (key.isComposite) {
    return {
      pk: makeKeyTemplate(key.partitionKeyPrefix, key.partitionKeyFields),
      sk: makeKeyTemplate(key.sortKeyPrefix, key.sortKeyFields),
    };
  }

  return {
    pk: makeKeyTemplate(key.prefix, key.fields),
  };
}
