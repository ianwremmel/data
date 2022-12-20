import type {Field, Table} from '../../../parser';

import {makeKeyTemplate, marshallField} from './helpers';

export interface MarshallTplInput {
  readonly table: Table;
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
    .filter((f) => f.isRequired)
    .filter(({fieldName}) => fieldName !== 'id');
  const optionalFields = fields.filter((f) => !f.isRequired);

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
  const builtinDateFields = requiredFields.filter(({fieldName}) =>
    builtinDateFieldNames.includes(fieldName)
  );

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
export function marshall${typeName}(input: ${inputTypeName}): Marshall${typeName}Output {
  const now = new Date();

  const updateExpression: string[] = [
  "#entity = :entity",
  ${requiredFields
    .map(({fieldName}) => `'#${fieldName} = :${fieldName}',`)
    .join('\n')}
  ${secondaryIndexes
    .map(({name, type}) =>
      type === 'gsi'
        ? [`'#${name}pk = :${name}pk',`, `'#${name}sk = :${name}sk',`]
        : [`'#${name}sk = :${name}sk',`]
    )
    .flat()
    .join('\n')}
  ];

  const ean: Record<string, string> = {
    "#entity": "_et",
    "#pk": "pk",
${requiredFields
  .map(({columnName, fieldName}) => `'#${fieldName}': '${columnName}',`)
  .join('\n')}
${secondaryIndexes
  .map(({name, type}) =>
    type === 'gsi'
      ? [`'#${name}pk': '${name}pk',`, `'#${name}sk': '${name}sk',`]
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
    ${builtinDateFields
      .map(({fieldName}) => `':${fieldName}': now.getTime(),`)
      .join('\n')}
    ${requiredFieldsWithDefaultBehaviors
      .map(({fieldName, isDateType}) => {
        if (fieldName === 'version') {
          return `':version': ('version' in input ? (input.version ?? 0) : 0) + 1,`;
        }
        if (fieldName === ttlConfig?.fieldName) {
          return `':${fieldName}': '${fieldName}' in input && input.${fieldName} ? ${marshallField(
            fieldName,
            isDateType
          )} : now.getTime() + ${ttlConfig.duration},`;
        }

        throw new Error(`No default behavior for field \`${fieldName}\``);
      })
      .join('\n')}
${secondaryIndexes
  .map((index) =>
    index.type === 'gsi'
      ? [
          `':${index.name}pk': \`${makeKeyTemplate(
            index.partitionKeyPrefix,
            index.partitionKeyFields
          )}\`,`,
          index.isComposite
            ? `':${index.name}sk': \`${makeKeyTemplate(
                index.sortKeyPrefix,
                index.sortKeyFields
              )}\`,`
            : undefined,
        ]
      : [
          `':${index.name}sk': \`${makeKeyTemplate(
            index.sortKeyPrefix,
            index.sortKeyFields
          )}\`,`,
        ]
  )
  .flat()
  .join('\n')}
  };

  ${optionalFields
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



  updateExpression.sort();

  return {
    ExpressionAttributeNames: ean,
    ExpressionAttributeValues: eav,
    UpdateExpression: "SET " + updateExpression.join(", ")
  };
}

  `;
}
