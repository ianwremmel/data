import type {GraphQLObjectType} from 'graphql';

import {marshalField} from '../../../common/helpers';
import {extractIndexInfo} from '../../../common/indexes';
import {extractKeyInfo} from '../../../common/keys';
import type {Table} from '../../../parser';
export interface MarshallTplInput {
  readonly irTable: Table;
  readonly objType: GraphQLObjectType;
}

/** Generates the marshall function for a table */
export function marshallTpl({
  irTable: {fields, ttlConfig, typeName},
  objType,
}: MarshallTplInput): string {
  const indexInfo = extractIndexInfo(objType);
  const keyInfo = extractKeyInfo(objType);

  const requiredFields = fields
    .filter((f) => f.isRequired)
    .filter(({fieldName}) => !keyInfo.fields.has(fieldName));
  const optionalFields = fields.filter((f) => !f.isRequired);

  return `
export interface Marshall${typeName}Output {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

/** Marshalls a DynamoDB record into a ${typeName} object */
export function marshall${typeName}(input: Record<string, any>): Marshall${typeName}Output {
  const now = new Date();

  const updateExpression: string[] = [
  "#entity = :entity",
  ${requiredFields
    .map(({fieldName}) => `'#${fieldName} = :${fieldName}',`)
    .join('\n')}
  ${indexInfo.updateExpressions.map((e) => `'${e}',`).join('\n')}
  ];

  const ean: Record<string, string> = {
    "#entity": "_et",
${requiredFields
  .map(({columnName, fieldName}) => `'#${fieldName}': '${columnName}',`)
  .join('\n')}
${keyInfo.ean.map((v) => `${v},`).join('\n')}
${indexInfo.ean.map((v) => `${v},`).join('\n')}
  };

  const eav: Record<string, unknown> = {
    ":entity": "${typeName}",
    ${requiredFields
      .map(({fieldName, isDateType}) => {
        if (fieldName === 'version') {
          return `':version': ('version' in input ? input.version : 0) + 1,`;
        }
        if (fieldName === ttlConfig?.fieldName) {
          return `':${fieldName}': now.getTime() + ${ttlConfig.duration},`;
        }
        if (fieldName === 'createdAt') {
          return `':${fieldName}': now.getTime(),`;
        }
        if (fieldName === 'updatedAt') {
          return `':${fieldName}': now.getTime(),`;
        }

        return `':${fieldName}': ${marshalField(fieldName, isDateType)},`;
      })
      .join('\n')}
${indexInfo.eav.map((v) => `${v},`).join('\n')}
  };

  ${optionalFields
    .map(
      ({columnName, fieldName, isDateType}) => `
  if ('${fieldName}' in input && typeof input.${fieldName} !== 'undefined') {
    ean['#${fieldName}'] = '${columnName}';
    eav[':${fieldName}'] = ${marshalField(fieldName, isDateType)};
    updateExpression.push('#${fieldName} = :${fieldName}');
  }
  `
    )
    .join('\n')};

  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: "SET " + updateExpression.join(", ")
  };
}

  `;
}
