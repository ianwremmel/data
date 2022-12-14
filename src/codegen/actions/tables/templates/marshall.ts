import type {GraphQLObjectType} from 'graphql/index';
import {isNonNullType} from 'graphql/index';
import {snakeCase} from 'lodash';

import {isType, marshalField} from '../../../common/helpers';
import {extractIndexInfo} from '../../../common/indexes';
import {extractKeyInfo} from '../../../common/keys';
import type {Table} from '../../../parser';

import {getAliasForField} from './unmarshall';

export interface MarshallTplInput {
  readonly irTable: Table;
  readonly objType: GraphQLObjectType;
}

/** Generates the marshall function for a table */
export function marshallTpl({irTable, objType}: MarshallTplInput): string {
  const indexInfo = extractIndexInfo(objType);
  const keyInfo = extractKeyInfo(objType);

  const fields = Object.values(objType.getFields()).map((f) => {
    const fieldName = f.name;
    const columnName = getAliasForField(f) ?? snakeCase(f.name);
    const isDateType = isType('Date', f);
    const isRequired = isNonNullType(f.type);
    return {
      columnName,
      field: f,
      fieldName,
      isDateType,
      isRequired,
    };
  });

  const requiredFields = fields.filter((f) => f.isRequired);
  const optionalFields = fields.filter((f) => !f.isRequired);

  return `
export interface Marshall${objType.name}Output {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
};

/** Marshalls a DynamoDB record into a ${objType.name} object */
export function marshall${objType.name}(input: Record<string, any>): Marshall${
    objType.name
  }Output {
  const now = new Date();

  const updateExpression: string[] = [
  '#entity = :entity',
  ${requiredFields
    .filter(({fieldName}) => !keyInfo.fields.has(fieldName))
    .map(({columnName, fieldName}) => `'#${fieldName} = :${fieldName}',`)
    .join('\n')}
  ${indexInfo.updateExpressions.map((e) => `'${e}',`).join('\n')}
  ];

  const ean: Record<string, string> = {
    '#entity': '_et',
${requiredFields
  .filter(({fieldName}) => !keyInfo.fields.has(fieldName))
  .map(({columnName, fieldName}) => `'#${fieldName}': '${columnName}',`)
  .join('\n')}
${keyInfo.ean.map((v) => `${v},`).join('\n')}
${indexInfo.ean.map((v) => `${v},`).join('\n')}
  };

  const eav: Record<string, unknown> = {
    ':entity': '${objType.name}',
    ${requiredFields
      .filter(({fieldName}) => !keyInfo.fields.has(fieldName))
      .map(({fieldName, field}) => {
        if (fieldName === 'version') {
          return `':version': ('version' in input ? input.version : 0) + 1,`;
        }
        if (fieldName === irTable.ttlConfig?.fieldName) {
          return `':${fieldName}': now.getTime() + ${irTable.ttlConfig.duration},`;
        }
        if (fieldName === 'createdAt') {
          return `':${fieldName}': now.getTime(),`;
        }
        if (fieldName === 'updatedAt') {
          return `':${fieldName}': now.getTime(),`;
        }

        return `':${fieldName}': ${marshalField(field)},`;
      })
      .join('\n')}
${indexInfo.eav.map((v) => `${v},`).join('\n')}
  }

  ${optionalFields
    .map(
      ({columnName, fieldName, field}) => `
  if ('${fieldName}' in input && typeof input.${fieldName} !== 'undefined') {
    ean['#${fieldName}'] = '${columnName}';
    eav[':${fieldName}'] = ${marshalField(field)};
    updateExpression.push('#${fieldName} = :${fieldName}');
  }
  `
    )
    .join('\n')}

  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: 'SET ' + updateExpression.join(', ')
  };
}

  `;
}
