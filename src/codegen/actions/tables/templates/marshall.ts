import assert from 'assert';

import {filterNull} from '../../../common/filters';
import type {Field, Model, TTLConfig} from '../../../parser';

import {makeKeyTemplate, marshallField} from './helpers';
import {
  indexHasField,
  indexToEANPart,
  indexToEAVPart,
  indexToUpdateExpressionPart,
} from './indexes';

export interface MarshallTplInput {
  readonly model: Model;
}

/** helper */
function wrapFieldNameWithQuotes({fieldName}: Field): string {
  return `'${fieldName}'`;
}

/** helper */
function makeTypeDefinition(
  typeName: string,
  requiredFields: readonly Field[],
  optionalFields: readonly Field[]
) {
  const rf = requiredFields.map(wrapFieldNameWithQuotes).sort().join('|');
  const of = optionalFields.map(wrapFieldNameWithQuotes).sort().join('|');

  let marshallType = `Required<Pick<${typeName}, ${rf}>>`;
  if (of.length) {
    marshallType += ` & Partial<Pick<${typeName}, ${of}>>`;
  }
  return marshallType;
}

/** Generates the marshall function for a table */
export function marshallTpl({
  model: {fields, primaryKey, secondaryIndexes, ttlConfig, typeName},
}: MarshallTplInput): string {
  const requiredFields = fields
    .filter((f) => f.isRequired && f.fieldName !== 'publicId')
    .filter(({fieldName}) => fieldName !== 'id');
  const optionalFields = fields.filter(
    (f) => !f.isRequired && f.fieldName !== 'publicId'
  );

  // These are fields that are required on the object but have overridable
  // default behaviors
  const requiredFieldsWithDefaultBehaviorsNames = [
    'version',
    ttlConfig?.fieldName,
  ].filter(filterNull);
  const requiredFieldsWithDefaultBehaviors = requiredFields.filter(
    ({fieldName}) => requiredFieldsWithDefaultBehaviorsNames.includes(fieldName)
  );

  // These are fields that are required on the object but have explicit,
  // non-overridable behaviors
  const builtinDateFieldNames = ['createdAt', 'updatedAt'];

  const normalRequiredFields = requiredFields.filter(
    ({fieldName}) =>
      !requiredFieldsWithDefaultBehaviorsNames.includes(fieldName) &&
      !builtinDateFieldNames.includes(fieldName)
  );

  const marshallType = makeTypeDefinition(typeName, normalRequiredFields, [
    ...optionalFields,
    ...requiredFieldsWithDefaultBehaviors,
  ]);

  const inputTypeName = `Marshall${typeName}Input`;

  return `
export interface Marshall${typeName}Output {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type ${inputTypeName} = ${marshallType};


/** Marshalls a DynamoDB record into a ${typeName} object */
export function marshall${typeName}(input: ${inputTypeName}, now = new Date()): Marshall${typeName}Output {
  const updateExpression: string[] = [
  "#entity = :entity",
  ${requiredFields
    .filter(
      ({fieldName}) =>
        fieldName !== ttlConfig?.fieldName && fieldName !== 'createdAt'
    )
    .map(({fieldName}) => `'#${fieldName} = :${fieldName}',`)
    .join('\n')}
  ${secondaryIndexes
    .filter(({name}) => name !== 'publicId')
    .filter((index) => !indexHasField('createdAt', primaryKey, index))
    .map(indexToUpdateExpressionPart)
    .flat()
    .join('\n')}
  ];

  const ean: Record<string, string> = {
    "#entity": "_et",
    "#pk": "pk",
${requiredFields
  .filter(
    ({fieldName}) =>
      fieldName !== ttlConfig?.fieldName && fieldName !== 'createdAt'
  )
  .map(({columnName, fieldName}) => `'#${fieldName}': '${columnName}',`)
  .join('\n')}
${secondaryIndexes
  .filter(({name}) => name !== 'publicId')
  .filter((index) => !indexHasField('createdAt', primaryKey, index))
  .map(indexToEANPart)
  .flat()
  .join('\n')}
  };

  const eav: Record<string, unknown> = {
    ":entity": "${typeName}",
    ${normalRequiredFields
      .map((field) => `':${field.fieldName}': ${marshallField(field)},`)
      .join('\n')}
    ':updatedAt': now.getTime(),
    ${requiredFieldsWithDefaultBehaviors
      .map(({fieldName}) => {
        if (fieldName === 'version') {
          return `':version': ('version' in input ? (input.version ?? 0) : 0) + 1,`;
        }
        if (fieldName === ttlConfig?.fieldName) {
          // do nothing because we're handling ttl later, but still keep the
          // conditional to avoid throwing down below.
          return '';
        }

        throw new Error(`No default behavior for field \`${fieldName}\``);
      })
      .filter(filterNull)
      .join('\n')}
${secondaryIndexes
  .filter(({name}) => name !== 'publicId')
  .filter((index) => !indexHasField('createdAt', primaryKey, index))
  .map((index) => indexToEAVPart('read', index))
  .flat()
  .join('\n')}
  };

  ${optionalFields
    // the TTL field will always be handled by renderTTL
    .filter(({fieldName}) => fieldName !== ttlConfig?.fieldName)
    .filter(({computeFunction}) => !computeFunction?.isVirtual)
    .map(
      (field) => `
  if ('${field.fieldName}' in input && typeof input.${
        field.fieldName
      } !== 'undefined') {
    ean['#${field.fieldName}'] = '${field.columnName}';
    eav[':${field.fieldName}'] = ${marshallField(field)};
    updateExpression.push('#${field.fieldName} = :${field.fieldName}');
  }
  `
    )
    .join('\n')};

  ${renderTTL(ttlConfig, fields)}

  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: "SET " + updateExpression.join(", ")
  };
}

  `;
}

/** template helper */
function renderTTL(
  ttlConfig: TTLConfig | undefined,
  fields: readonly Field[]
): string {
  if (!ttlConfig) {
    return '';
  }

  const {duration, fieldName} = ttlConfig;

  const field = fields.find(({fieldName: f}) => f === fieldName);
  assert(field, `Field ${fieldName} not found`);

  const out = `
  if ('${fieldName}' in input && typeof input.${fieldName} !== 'undefined') {
    assert(!Number.isNaN(input.${fieldName}${
    field.isRequired ? '' : '?'
  }.getTime()),'${fieldName} was passed but is not a valid date');
    ean['#${fieldName}'] = 'ttl';
    eav[':${fieldName}'] = input.${fieldName} === null
      ? null
      : ${marshallField(field)};
    updateExpression.push('#${fieldName} = :${fieldName}');
  }
  `;

  if (duration) {
    return `${out} else {
      ean['#${fieldName}'] = 'ttl';
      eav[':${fieldName}'] = now.getTime() + ${duration};
      updateExpression.push('#${fieldName} = :${fieldName}');
    }`;
  }

  assert(
    !field.isRequired,
    'TTL field must be optional if duration is not present'
  );

  return out;
}
