import {GraphQLObjectType} from 'graphql';
import {snakeCase} from 'lodash';

import {extractTtlInfo} from '../../common/fields';
import {hasDirective, marshalField} from '../../common/helpers';
import {extractIndexInfo, IndexFieldInfo} from '../../common/indexes';
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
  const indexInfo = extractIndexInfo(objType);
  const keyInfo = extractKeyInfo(objType);
  const ttlInfo = extractTtlInfo(objType);

  const ean: string[] = [];
  const eav: string[] = [];
  const updateExpressions: string[] = [];

  const fields = objType.getFields();
  const fieldNames = Object.keys(fields).sort();

  ean.push(`'#entity': '_et'`);
  eav.push(`':entity': '${objType.name}'`);
  updateExpressions.push(`#entity = :entity`);

  for (const fieldName of fieldNames) {
    const field = fields[fieldName];

    if (keyInfo.fields.has(fieldName)) {
      // intentionally empty. if key fields need to do anything, they'll be
      // handled after the loop
    } else if (fieldName === 'version') {
      ean.push(`'#version': '_v'`);
      eav.push(`':version': 1`);
      updateExpressions.push(`#version = :version`);
    } else if (fieldName === ttlInfo?.fieldName) {
      ean.push(`'#ttl': 'ttl'`);
      eav.push(`':ttl': now.getTime() + ${ttlInfo.duration}`);
      updateExpressions.push(`#ttl = :ttl`);
    } else if (fieldName === 'createdAt') {
      ean.push(`'#${fieldName}': '_ct'`);
      eav.push(`':${fieldName}': now.getTime()`);
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else if (fieldName === 'updatedAt') {
      ean.push(`'#${fieldName}': '_md'`);
      eav.push(`':${fieldName}': now.getTime()`);
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else {
      ean.push(`'#${fieldName}': '${snakeCase(fieldName)}'`);
      eav.push(`':${fieldName}': ${marshalField(field)}`);
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    }
  }

  ean.push(...keyInfo.ean);
  ean.push(...indexInfo.ean);
  eav.push(...indexInfo.eav);
  updateExpressions.push(...indexInfo.updateExpressions);

  ean.sort();
  eav.sort();
  updateExpressions.sort();

  return createItemTpl({
    conditionField: keyInfo.conditionField,
    ean,
    eav,
    key: keyInfo.keyForCreate,
    objType,
    omit: [...keyInfo.omitForCreate, ttlInfo?.fieldName ?? ''].filter(Boolean),
    updateExpressions,
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
      ean.push(`'#ttl': 'ttl'`);
      eav.push(`':ttlInc': ${ttlInfo.duration}`);
      updateExpressions.push(`#ttl = #ttl + :ttlInc`);
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
  const indexInfo = extractIndexInfo(objType);
  const keyInfo = extractKeyInfo(objType);
  const ttlInfo = extractTtlInfo(objType);

  const ean: string[] = [];
  const eav: string[] = [];
  const updateExpressions: string[] = [];

  const fields = objType.getFields();
  const fieldNames = Object.keys(fields).sort();

  for (const fieldName of fieldNames) {
    const field = fields[fieldName];

    if (keyInfo.fields.has(fieldName)) {
      // intentionally empty. if key fields need to do anything, they'll be
      // handled after the loop
    } else if (fieldName === ttlInfo?.fieldName) {
      ean.push(`'#ttl': 'ttl'`);
      eav.push(`':ttl': now.getTime() + ${ttlInfo.duration}`);
      updateExpressions.push(`#ttl = :ttl`);
    } else if (fieldName === 'version') {
      ean.push(`'#version': '_v'`);
      eav.push(`':newVersion': input.version + 1`);
      eav.push(`':version': input.version`);
      updateExpressions.push(`#version = :newVersion`);
    } else if (fieldName === 'createdAt') {
      ean.push(`'#${fieldName}': '_ct'`);
      eav.push(`':${fieldName}': now.getTime()`);
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else if (fieldName === 'updatedAt') {
      ean.push(`'#${fieldName}': '_md'`);
      eav.push(`':${fieldName}': now.getTime()`);
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else {
      ean.push(`'#${fieldName}': '${snakeCase(fieldName)}'`);
      eav.push(`':${fieldName}': ${marshalField(field)}`);
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    }
  }

  ean.push(...keyInfo.ean);
  ean.push(...indexInfo.ean);
  eav.push(...indexInfo.eav);
  updateExpressions.push(...indexInfo.updateExpressions);

  ean.sort();
  eav.sort();
  updateExpressions.sort();

  return updateItemTpl({
    conditionField: keyInfo.conditionField,
    ean,
    eav,
    inputToPrimaryKey: keyInfo.inputToPrimaryKey,
    key: keyInfo.keyForReadAndUpdate,
    objType,
    ttlInfo,
    updateExpressions,
  });
}
