import assert from 'assert';

import {filterNull} from '../../../common/filters';
import type {Field, Model, TTLConfig} from '../../../parser';

import {makeKeyTemplate, marshallField} from './helpers';

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
  model: {fields, secondaryIndexes, ttlConfig, typeName},
}: MarshallTplInput): string {
  const requiredFields = fields
    .filter((f) => f.isRequired && f.fieldName !== 'publicId')
    .filter(({fieldName}) => fieldName !== 'id')
    .filter(({computeFunction}) => !computeFunction?.isVirtual);
  const optionalFields = fields
    .filter((f) => !f.isRequired && f.fieldName !== 'publicId')
    .filter(({computeFunction}) => !computeFunction?.isVirtual);

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

  const marshallType = makeTypeDefinition(
    typeName,
    normalRequiredFields.filter(({computeFunction}) => !computeFunction),
    [...optionalFields, ...requiredFieldsWithDefaultBehaviors].filter(
      ({computeFunction}) => !computeFunction
    )
  );

  const virtualRequiredFields = fields
    .filter(({isRequired}) => isRequired)
    .filter(({computeFunction}) => computeFunction?.isVirtual);

  const virtualOptionalFields = fields
    .filter(({isRequired}) => !isRequired)
    .filter(({computeFunction}) => computeFunction?.isVirtual);

  const hasVirtualFields =
    virtualRequiredFields.length > 0 || virtualOptionalFields.length > 0;

  const virtualType = makeTypeDefinition(
    typeName,
    [...normalRequiredFields, ...virtualRequiredFields],
    [
      ...optionalFields,
      ...requiredFieldsWithDefaultBehaviors,
      ...virtualOptionalFields,
    ]
  );

  const inputTypeName = `Marshall${typeName}Input`;
  const virtualTypeName = `VirtualMarshall${typeName}Input`;

  const hasComputedFields = fields.some(
    ({computeFunction}) => !!computeFunction
  );

  return `
export interface Marshall${typeName}Output {
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, NativeAttributeValue>;
  UpdateExpression: string;
}

export type ${inputTypeName} = ${marshallType};

${hasVirtualFields ? `type ${virtualTypeName} = ${virtualType};` : ''}

/** Marshalls a DynamoDB record into a ${typeName} object */
export function marshall${typeName}(${
    hasComputedFields ? '_input' : 'input'
  }: ${inputTypeName}, now = new Date()): Marshall${typeName}Output {

  ${
    hasComputedFields
      ? `
      // Make a copy so that if we have to define fields, we don't modify the
      // original input.
      const input: ${
        hasVirtualFields ? virtualTypeName : inputTypeName
      } = {..._input}${hasVirtualFields ? `as ${virtualTypeName}` : ''}`
      : ``
  }
  ${defineComputedFields(fields, typeName)}

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

/**
 * Uses Object.defineProperty to add computed fields to `input` so that
 * order-of-access doesn't matter.
 */
function defineComputedFields(fields: readonly Field[], typeName: string) {
  return fields
    .filter(({computeFunction}) => !!computeFunction)
    .map(({fieldName, computeFunction}) => {
      return `
        let ${fieldName}Computed = false;
        let ${fieldName}ComputedValue: ${typeName}['${fieldName}'];
        Object.defineProperty(input, '${fieldName}', {
          enumerable: true,
          /** getter */
          get() {
            if (!${fieldName}Computed) {
              ${fieldName}Computed = true
              ${fieldName}ComputedValue = ${computeFunction?.importName}(this);
            }
            return ${fieldName}ComputedValue;
          }
        })`;
    })
    .join('\n');
}
