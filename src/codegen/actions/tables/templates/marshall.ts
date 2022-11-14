import {GraphQLObjectType, isNonNullType} from 'graphql/index';
import {snakeCase} from 'lodash';

import {isType} from '../../../common/helpers';
import {extractIndexInfo} from '../../../common/indexes';
import {extractKeyInfo} from '../../../common/keys';

import {getAliasForField} from './unmarshall';

export interface MarshallTplInput {
  readonly objType: GraphQLObjectType;
}

/** Generates the marshall function for a table */
export function marshallTpl({objType}: MarshallTplInput): string {
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
  UpdateExpression: string
};

/** Marshalls a DynamoDB record into a ${objType.name} object */
export function marshall${objType.name}(input: Record<string, any>): Marshall${
    objType.name
  }Output {
  const updateExpression: string[] = [
  '#entity = :entity',
  ${requiredFields
    .filter(({fieldName}) => !keyInfo.fields.has(fieldName))
    .map(({columnName, fieldName}) => `'#${fieldName} = :${fieldName}',`)
    .join('\n')}
  ${indexInfo.updateExpressions.map((e) => `'${e}',`).join('\n')}
  ];

  ${optionalFields
    .map(
      ({columnName, fieldName}) => `
  if ('${fieldName}' in input) {
    updateExpression.push('#${fieldName} = :${fieldName}');
  }
  `
    )
    .join('\n')}

  updateExpression.sort();

  return {UpdateExpression: 'SET ' + updateExpression.join(', ')};
}

  `;
}
