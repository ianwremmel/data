import assert from 'assert';

import {GraphQLObjectType} from 'graphql';

import {Nullable} from '../../types';

export interface KeyInfo {
  readonly fields: Set<string>;
  readonly omitForCreate: readonly string[];
  readonly keyForCreate: Record<string, string>;
  readonly keyForReadAndUpdate: Record<string, string>;
}

/**
 * Parses out a types key fields and generates the necessary code for
 * marshalling/unmarshalling them.
 */
export function extractKeyInfo(type: GraphQLObjectType): KeyInfo {
  const directive = type.astNode?.directives?.find(
    (d) => d.name.value === 'autoKey'
  );
  assert(directive, `Expected type ${type.name} to have @autoKey directive`);
  assert(directive.arguments, `Expected @autoKey directive to have arguments`);
  const directiveField = directive.arguments.find(
    (a) => a.name.value === 'field'
  );
  assert(
    directiveField,
    `Expected @autoKey directive to have argument "fields"`
  );

  const field =
    directiveField.value.kind === 'StringValue' && directiveField.value.value;
  assert(field, `Expected @autoKey directive to have argument "field"`);

  return {
    fields: new Set([field]),
    keyForCreate: {
      [field]: `id: \`${type.name}#\${uuidv4()}\``,
    },
    keyForReadAndUpdate: {
      [field]: `${field}: input.${field}`,
    },
    omitForCreate: [field],
  };
}

export interface TtlInfo {
  readonly duration: number;
  readonly fieldName: string;
}

/**
 * Parses a type that might have ttl info and returns its useful parts.
 */
export function extractTtlInfo(type: GraphQLObjectType): Nullable<TtlInfo> {
  const fields =
    type.astNode?.fields?.filter((field) =>
      field.directives?.map(({name}) => name.value).includes('ttl')
    ) ?? [];

  if (fields.length === 0) {
    return null;
  }

  assert(fields.length < 2, 'Only one ttl field is allowed per type');

  const field = fields?.[0];

  const fieldName = field?.name.value;
  const directive = field.directives?.find((d) => d.name.value === 'ttl');

  const arg = directive?.arguments?.find((a) => a.name.value === 'duration');

  assert(arg?.value.kind === 'StringValue', 'ttl duration must be a string');
  const duration = arg.value.value;

  const durationUnit = duration?.slice(-1);
  const durationValue = duration?.slice(0, -1);

  switch (durationUnit) {
    case 's':
      return {duration: Number(durationValue) * 1000, fieldName};
    case 'm':
      return {duration: Number(durationValue) * 1000 * 60, fieldName};
    case 'h':
      return {duration: Number(durationValue) * 1000 * 60 * 60, fieldName};
    case 'd':
      return {
        duration: Number(durationValue) * 1000 * 60 * 60 * 24,
        fieldName,
      };
    default:
      throw new Error(
        `Invalid ttl duration: ${duration}. Unit must be one of s, m, h, d`
      );
  }
}
