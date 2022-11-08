import {GraphQLObjectType} from 'graphql';
import {snakeCase} from 'lodash';

import {extractKeyInfo, extractTtlInfo} from '../../common/fields';
import {hasDirective, unmarshalField} from '../../common/helpers';

import {createItemTpl} from './templates/create-item';
import {deleteItemTpl} from './templates/delete-item';
import {readItemTpl} from './templates/read-item';
import {touchItemTpl} from './templates/touch-item';
import {updateItemTpl} from './templates/update-item';

/**
 * Generates the createItem function for a table
 */
export function createItemTemplate(objType: GraphQLObjectType) {
  const ttlInfo = extractTtlInfo(objType);

  const ean: string[] = [];
  const eav: string[] = [];
  const key: string[] = [];
  const unmarshall: string[] = [];
  const updateExpressions: string[] = [];

  const fields = objType.getFields();
  const fieldNames = Object.keys(fields).sort();

  ean.push(`'#entity': '_et'`);
  eav.push(`':entity': '${objType.name}'`);
  updateExpressions.push(`#entity = :entity`);

  const keyInfo = extractKeyInfo(objType);

  for (const fieldName of fieldNames) {
    const field = fields[fieldName];

    if (keyInfo.fields.has(fieldName)) {
      ean.push(`'#${fieldName}': '${fieldName}'`);
      key.push(keyInfo.keyForCreate[fieldName]);
      unmarshall.push(unmarshalField(field));
    } else if (fieldName === 'version') {
      ean.push(`'#version': '_v'`);
      eav.push(`':version': 1`);
      unmarshall.push(unmarshalField(field, '_v'));
      updateExpressions.push(`#version = :version`);
    } else if (fieldName === ttlInfo?.fieldName) {
      ean.push(`'#ttl': 'ttl'`);
      eav.push(`':ttl': now.getTime() + ${ttlInfo.duration}`);
      unmarshall.push(unmarshalField(field, 'ttl'));
      updateExpressions.push(`#ttl = :ttl`);
    } else if (fieldName === 'createdAt') {
      ean.push(`'#${fieldName}': '_ct'`);
      eav.push(`':${fieldName}': now.getTime()`);
      unmarshall.push(unmarshalField(field, '_ct'));
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else if (fieldName === 'updatedAt') {
      ean.push(`'#${fieldName}': '_md'`);
      eav.push(`':${fieldName}': now.getTime()`);
      unmarshall.push(unmarshalField(field, '_md'));
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else {
      ean.push(`'#${fieldName}': '${snakeCase(fieldName)}'`);
      eav.push(`':${fieldName}': input.${fieldName}`);
      unmarshall.push(unmarshalField(field));
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    }
  }

  ean.sort();
  eav.sort();
  unmarshall.sort();
  updateExpressions.sort();

  return createItemTpl({
    ean,
    eav,
    key,
    keyInfo,
    objType,
    ttlInfo,
    unmarshall,
    updateExpressions,
  });
}

/**
 * Generates the deleteItem function for a table
 */
export function deleteItemTemplate(objType: GraphQLObjectType) {
  const ean: string[] = [`'#id': 'id'`];
  const key = [`id: input.id`];
  return deleteItemTpl({ean, key, objType});
}

/**
 * Generates the readItem function for a table
 */
export function readItemTemplate(objType: GraphQLObjectType) {
  const ttlInfo = extractTtlInfo(objType);
  const consistent = hasDirective('consistent', objType);

  const key = [`id: input.id`];
  const unmarshall: string[] = [];

  const fields = objType.getFields();
  const fieldNames = Object.keys(fields).sort();

  const keyInfo = extractKeyInfo(objType);

  for (const fieldName of fieldNames) {
    const field = fields[fieldName];

    if (keyInfo.fields.has(fieldName)) {
      unmarshall.push(unmarshalField(field));
    } else if (fieldName === 'version') {
      unmarshall.push(unmarshalField(field, '_v'));
    } else if (fieldName === ttlInfo?.fieldName) {
      unmarshall.push(unmarshalField(field, 'ttl'));
    } else if (fieldName === 'createdAt') {
      unmarshall.push(unmarshalField(field, '_ct'));
    } else if (fieldName === 'updatedAt') {
      unmarshall.push(unmarshalField(field, '_md'));
    } else {
      unmarshall.push(unmarshalField(field));
    }
  }

  unmarshall.sort();

  return readItemTpl({consistent, key, objType, unmarshall});
}

/**
 * Generates the updateItem function for a table
 */
export function touchItemTemplate(objType: GraphQLObjectType) {
  const ttlInfo = extractTtlInfo(objType);

  const ean: string[] = [];
  const eav: string[] = [];
  const key: string[] = [`id: input.id`];
  const updateExpressions: string[] = [];

  const fieldNames = Object.keys(objType.getFields()).sort();

  const keyInfo = extractKeyInfo(objType);

  for (const fieldName of fieldNames) {
    if (keyInfo.fields.has(fieldName)) {
      ean.push(`'#${fieldName}': '${fieldName}'`);
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

  ean.sort();
  eav.sort();
  updateExpressions.sort();

  return touchItemTpl({ean, eav, key, objType, updateExpressions});
}

/**
 * Generates the updateItem function for a table
 */
export function updateItemTemplate(objType: GraphQLObjectType) {
  const ttlInfo = extractTtlInfo(objType);

  const ean: string[] = [];
  const eav: string[] = [];
  const inputToPrimaryKey: string[] = [];
  const key: string[] = [];
  const unmarshall: string[] = [];
  const updateExpressions: string[] = [];

  const fields = objType.getFields();
  const fieldNames = Object.keys(fields).sort();

  const keyInfo = extractKeyInfo(objType);

  for (const fieldName of fieldNames) {
    const field = fields[fieldName];

    if (keyInfo.fields.has(fieldName)) {
      ean.push(`'#${fieldName}': '${fieldName}'`);
      inputToPrimaryKey.push(keyInfo.keyForReadAndUpdate[fieldName]);
      key.push(keyInfo.keyForReadAndUpdate[fieldName]);
      unmarshall.push(unmarshalField(field));
    } else if (fieldName === ttlInfo?.fieldName) {
      ean.push(`'#ttl': 'ttl'`);
      eav.push(`':ttl': now.getTime() + ${ttlInfo.duration}`);
      unmarshall.push(unmarshalField(field, 'ttl'));
      updateExpressions.push(`#ttl = :ttl`);
    } else if (fieldName === 'version') {
      ean.push(`'#version': '_v'`);
      eav.push(`':newVersion': input.version + 1`);
      eav.push(`':version': input.version`);
      unmarshall.push(unmarshalField(field, '_v'));
      updateExpressions.push(`#version = :newVersion`);
    } else if (fieldName === 'createdAt') {
      ean.push(`'#${fieldName}': '_ct'`);
      eav.push(`':${fieldName}': now.getTime()`);
      unmarshall.push(unmarshalField(field, '_ct'));
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else if (fieldName === 'updatedAt') {
      ean.push(`'#${fieldName}': '_md'`);
      eav.push(`':${fieldName}': now.getTime()`);
      unmarshall.push(unmarshalField(field, '_md'));
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else {
      ean.push(`'#${fieldName}': '${snakeCase(fieldName)}'`);
      eav.push(`':${fieldName}': input.${fieldName}`);
      unmarshall.push(unmarshalField(field));
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    }
  }

  ean.sort();
  eav.sort();
  updateExpressions.sort();

  return updateItemTpl({
    ean,
    eav,
    inputToPrimaryKey,
    key,
    objType,
    ttlInfo,
    unmarshall,
    updateExpressions,
  });
}
