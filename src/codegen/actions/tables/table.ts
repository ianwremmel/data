import type {GraphQLObjectType} from 'graphql';

import {extractTtlInfo} from '../../common/fields';
import {hasDirective} from '../../common/helpers';
import type {IndexFieldInfo} from '../../common/indexes';
import {extractIndexInfo} from '../../common/indexes';
import {extractKeyInfo} from '../../common/keys';

import {createItemTpl} from './templates/create-item';
import {deleteItemTpl} from './templates/delete-item';
import {queryTpl} from './templates/query';
import {readItemTpl} from './templates/read-item';
import {touchItemTpl} from './templates/touch-item';
import {updateItemTpl} from './templates/update-item';

/**
 * Generates the createItem function for a table
 */
export function createItemTemplate(objType: GraphQLObjectType) {
  const keyInfo = extractKeyInfo(objType);
  const ttlInfo = extractTtlInfo(objType);

  return createItemTpl({
    conditionField: keyInfo.conditionField,
    key: keyInfo.keyForCreate,
    omit: ['id', ttlInfo?.fieldName ?? ''].filter(Boolean),
    tableName: `Table${objType.name}`,
    typeName: objType.name,
  });
}

/**
 * Generates the deleteItem function for a table
 */
export function deleteItemTemplate(objType: GraphQLObjectType) {
  const keyInfo = extractKeyInfo(objType);

  return deleteItemTpl({
    conditionField: keyInfo.conditionField,
    ean: keyInfo.ean,
    key: keyInfo.keyForReadAndUpdate,
    objType,
  });
}

/**
 * Generates the query function for a table
 */
export function queryTemplate(objType: GraphQLObjectType) {
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
    objType,
  });
}

/**
 * Generates the readItem function for a table
 */
export function readItemTemplate(objType: GraphQLObjectType) {
  const keyInfo = extractKeyInfo(objType);

  const consistent = hasDirective('consistent', objType);

  return readItemTpl({
    consistent,
    key: keyInfo.keyForReadAndUpdate,
    objType,
  });
}

/**
 * Generates the updateItem function for a table
 */
export function touchItemTemplate(objType: GraphQLObjectType) {
  const keyInfo = extractKeyInfo(objType);
  const ttlInfo = extractTtlInfo(objType);

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
    } else if (fieldName === ttlInfo?.fieldName) {
      ean.push(`'#${fieldName}': 'ttl'`);
      eav.push(`':ttlInc': ${ttlInfo.duration}`);
      updateExpressions.push(`#${fieldName} = #${fieldName} + :ttlInc`);
    }
  }

  ean.push(...keyInfo.ean);

  ean.sort();
  eav.sort();
  updateExpressions.sort();

  return touchItemTpl({
    conditionField: keyInfo.conditionField,
    ean,
    eav,
    key: keyInfo.keyForReadAndUpdate,
    objType,
    updateExpressions,
  });
}

/**
 * Generates the updateItem function for a table
 */
export function updateItemTemplate(objType: GraphQLObjectType) {
  const keyInfo = extractKeyInfo(objType);
  const ttlInfo = extractTtlInfo(objType);

  return updateItemTpl({
    conditionField: keyInfo.conditionField,
    inputToPrimaryKey: keyInfo.inputToPrimaryKey,
    key: keyInfo.keyForReadAndUpdate,
    objType,
    ttlInfo,
  });
}
