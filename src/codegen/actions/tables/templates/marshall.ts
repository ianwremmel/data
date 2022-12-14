import assert from 'assert';

import type {Field, Model, TTLConfig} from '../../../parser';

import {makeKeyTemplate, marshallField} from './helpers';

export interface MarshallTplInput {
  readonly table: Model;
}
/** helper */
function wrapFieldNameWithQuotes({fieldName}: Field): string {
  return `'${fieldName}'`;
}

/** Generates the marshall function for a table */
export function marshallTpl({
  table: {fields, secondaryIndexes, ttlConfig, typeName},
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
  ].filter(Boolean) as string[];
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

  const rf = normalRequiredFields.map(wrapFieldNameWithQuotes).sort().join('|');
  const of = [
    ...optionalFields.map(wrapFieldNameWithQuotes).sort(),
    ...requiredFieldsWithDefaultBehaviors.map(wrapFieldNameWithQuotes).sort(),
  ].join('|');
  let marshallType = `Required<Pick<${typeName}, ${rf}>>`;
  if (of.length) {
    marshallType += ` & Partial<Pick<${typeName}, ${of}>>`;
  }

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
    .map(({isSingleField, name, type}) =>
      type === 'gsi'
        ? isSingleField
          ? []
          : [`'#${name}pk = :${name}pk',`, `'#${name}sk = :${name}sk',`]
        : [`'#${name}sk = :${name}sk',`]
    )
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
  .map(({isSingleField, name, type}) =>
    type === 'gsi'
      ? isSingleField
        ? []
        : [`'#${name}pk': '${name}pk',`, `'#${name}sk': '${name}sk',`]
      : [`'#${name}sk': '${name}sk',`]
  )
  .flat()
  .join('\n')}
  };

  const eav: Record<string, unknown> = {
    ":entity": "${typeName}",
    ${normalRequiredFields
      .map(
        ({fieldName, isDateType}) =>
          `':${fieldName}': ${marshallField(fieldName, isDateType)},`
      )
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
      .filter(Boolean)
      .join('\n')}
${secondaryIndexes
  .filter(({name}) => name !== 'publicId')
  .map((index) => {
    if (index.type === 'gsi') {
      if (index.isSingleField) {
        return [];
      }
      return [
        `':${`${index.name}pk`}': \`${makeKeyTemplate(
          index.partitionKeyPrefix,
          index.partitionKeyFields,
          'read'
        )}\`,`,
        index.isComposite
          ? `':${index.name}sk': \`${makeKeyTemplate(
              index.sortKeyPrefix,
              index.sortKeyFields,
              'read'
            )}\`,`
          : undefined,
      ];
    }

    return [
      `':${index.name}sk': \`${makeKeyTemplate(
        index.sortKeyPrefix,
        index.sortKeyFields,
        'read'
      )}\`,`,
    ];
  })
  .flat()
  .join('\n')}
  };

  ${optionalFields
    // the TTL field will always be handled by renderTTL
    .filter(({fieldName}) => fieldName !== ttlConfig?.fieldName)
    .map(
      ({columnName, fieldName, isDateType}) => `
  if ('${fieldName}' in input && typeof input.${fieldName} !== 'undefined') {
    ean['#${fieldName}'] = '${columnName}';
    eav[':${fieldName}'] = ${marshallField(fieldName, isDateType)};
    updateExpression.push('#${fieldName} = :${fieldName}');
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

  const {isDateType} = field;
  const out = `
  if ('${fieldName}' in input && typeof input.${fieldName} !== 'undefined') {
    assert(!Number.isNaN(input.${fieldName}${
    field.isRequired ? '' : '?'
  }.getTime()),'${fieldName} was passed but is not a valid date');
    ean['#${fieldName}'] = 'ttl';
    eav[':${fieldName}'] = input.${fieldName} === null
      ? null
      : ${marshallField(fieldName, isDateType)};
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
