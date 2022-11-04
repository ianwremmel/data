import {GraphQLObjectType, isNonNullType, isScalarType} from 'graphql';
import {snakeCase} from 'lodash';

import {extractTtlInfo} from '../../common/fields';
import {fieldsOfType, hasDirective} from '../../common/helpers';

import {createItemTpl} from './templates/create-item';
import {deleteItemTpl} from './templates/delete-item';
import {readItemTpl} from './templates/read-item';
import {touchItemTpl} from './templates/touch-item';
import {updateItemTpl} from './templates/update-item';

/**
 * Generates the createItem function for a simple table
 */
export function createItemTemplate(objType: GraphQLObjectType) {
  const ttlInfo = extractTtlInfo(objType);

  const dateFields = fieldsOfType('Date', objType).map(
    ([fieldName]) => fieldName
  );

  const ean: string[] = [];
  const eav: string[] = [];
  const unmarshall: string[] = [];
  const updateExpressions: string[] = [];

  const fieldNames = Object.keys(objType.getFields()).sort();

  ean.push(`'#entity': '_et'`);
  eav.push(`':entity': '${objType.name}'`);
  updateExpressions.push(`#entity = :entity`);

  for (const fieldName of fieldNames) {
    if (fieldName === 'id') {
      ean.push(`'#id': 'id'`);
      unmarshall.push(`id: data.Attributes?.id`);
    } else if (fieldName === 'version') {
      ean.push(`'#version': '_v'`);
      eav.push(`':version': 1`);
      unmarshall.push(`version: data.Attributes?._v`);
      updateExpressions.push(`#version = :version`);
    } else if (fieldName === ttlInfo?.fieldName) {
      ean.push(`'#ttl': 'ttl'`);
      eav.push(`':ttl': now.getTime() + ${ttlInfo.duration}`);
      unmarshall.push(`${ttlInfo.fieldName}: new Date(data.Attributes?.ttl)`);
      updateExpressions.push(`#ttl = :ttl`);
    } else if (fieldName === 'createdAt') {
      ean.push(`'#${fieldName}': '_ct'`);
      eav.push(`':${fieldName}': now.getTime()`);
      unmarshall.push(`${fieldName}: new Date(data.Attributes?._ct)`);
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else if (fieldName === 'updatedAt') {
      ean.push(`'#${fieldName}': '_md'`);
      eav.push(`':${fieldName}': now.getTime()`);
      unmarshall.push(`${fieldName}: new Date(data.Attributes?._md)`);
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else {
      ean.push(`'#${fieldName}': '${snakeCase(fieldName)}'`);
      eav.push(`':${fieldName}': input.${fieldName}`);
      if (dateFields.includes(fieldName)) {
        unmarshall.push(
          `${fieldName}: new Date(data.Attributes?.${snakeCase(fieldName)})`
        );
      } else {
        unmarshall.push(
          `${fieldName}: data.Attributes?.${snakeCase(fieldName)}`
        );
      }
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
    objType,
    ttlInfo,
    unmarshall,
    updateExpressions,
  });
}

/**
 * Generates the deleteItem function for a simple table
 */
export function deleteItemTemplate(objType: GraphQLObjectType) {
  return deleteItemTpl({objType});
}

/**
 * Generates the readItem function for a simple table
 */
export function readItemTemplate(objType: GraphQLObjectType) {
  const ttlInfo = extractTtlInfo(objType);
  const consistent = hasDirective('consistent', objType);

  const unmarshall: string[] = [];

  const fieldNames = Object.keys(objType.getFields()).sort();

  const dateFields = fieldsOfType('Date', objType).map(
    ([fieldName]) => fieldName
  );

  for (const fieldName of fieldNames) {
    if (fieldName === 'id') {
      unmarshall.push(`id: data.Item?.id`);
    } else if (fieldName === 'version') {
      unmarshall.push(`version: data.Item?._v`);
    } else if (fieldName === ttlInfo?.fieldName) {
      unmarshall.push(`${ttlInfo.fieldName}: new Date(data.Item?.ttl)`);
    } else if (fieldName === 'createdAt') {
      unmarshall.push(`${fieldName}: new Date(data.Item?._ct)`);
    } else if (fieldName === 'updatedAt') {
      unmarshall.push(`${fieldName}: new Date(data.Item?._md)`);
    } else if (dateFields.includes(fieldName)) {
      unmarshall.push(
        `${fieldName}: new Date(data.Item?.${snakeCase(fieldName)})`
      );
    } else {
      unmarshall.push(`${fieldName}: data.Item?.${snakeCase(fieldName)}`);
    }
  }

  return readItemTpl({consistent, objType, unmarshall});
}

/**
 * Generates the updateItem function for a simple table
 */
export function touchItemTemplate(objType: GraphQLObjectType) {
  const ttlInfo = extractTtlInfo(objType);

  const ean: string[] = [];
  const eav: string[] = [];
  const updateExpressions: string[] = [];

  const fieldNames = Object.keys(objType.getFields()).sort();

  for (const fieldName of fieldNames) {
    if (fieldName === 'id') {
      ean.push(`'#id': 'id'`);
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

  return touchItemTpl({ean, eav, objType, updateExpressions});
}

/**
 * Generates the updateItem function for a simple table
 */
export function updateItemTemplate(objType: GraphQLObjectType) {
  const ttlInfo = extractTtlInfo(objType);

  const dateFields = Object.entries(objType.getFields())
    .filter(([, field]) => {
      let {type} = field;
      if (isNonNullType(type)) {
        type = type.ofType;
      }

      return isScalarType(type) && type.name === 'Date';
    })
    .map(([fieldName]) => fieldName);

  const ean: string[] = [];
  const eav: string[] = [];
  const unmarshall: string[] = [];
  const updateExpressions: string[] = [];

  const fieldNames = Object.keys(objType.getFields()).sort();

  for (const fieldName of fieldNames) {
    if (fieldName === 'id') {
      ean.push(`'#id': 'id'`);
      unmarshall.push(`id: data.Attributes?.id`);
    } else if (fieldName === ttlInfo?.fieldName) {
      ean.push(`'#ttl': 'ttl'`);
      eav.push(`':ttl': now.getTime() + ${ttlInfo.duration}`);
      unmarshall.push(`${ttlInfo.fieldName}: new Date(data.Attributes?.ttl)`);
      updateExpressions.push(`#ttl = :ttl`);
    } else if (fieldName === 'version') {
      ean.push(`'#version': '_v'`);
      eav.push(`':newVersion': input.version + 1`);
      eav.push(`':version': input.version`);
      unmarshall.push(`version: data.Attributes?._v`);
      updateExpressions.push(`#version = :newVersion`);
    } else if (fieldName === 'createdAt') {
      ean.push(`'#${fieldName}': '_ct'`);
      eav.push(`':${fieldName}': now.getTime()`);
      unmarshall.push(`${fieldName}: new Date(data.Attributes?._ct)`);
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else if (fieldName === 'updatedAt') {
      ean.push(`'#${fieldName}': '_md'`);
      eav.push(`':${fieldName}': now.getTime()`);
      unmarshall.push(`${fieldName}: new Date(data.Attributes?._md)`);
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    } else {
      ean.push(`'#${fieldName}': '${snakeCase(fieldName)}'`);
      eav.push(`':${fieldName}': input.${fieldName}`);
      if (dateFields.includes(fieldName)) {
        unmarshall.push(
          `${fieldName}: new Date(data.Attributes?.${snakeCase(fieldName)})`
        );
      } else {
        unmarshall.push(
          `${fieldName}: data.Attributes?.${snakeCase(fieldName)}`
        );
      }
      updateExpressions.push(`#${fieldName} = :${fieldName}`);
    }
  }

  ean.sort();
  eav.sort();
  updateExpressions.sort();

  return updateItemTpl({
    ean,
    eav,
    objType,
    ttlInfo,
    unmarshall,
    updateExpressions,
  });
}
