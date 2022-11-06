import assert from 'assert';

import {GraphQLObjectType} from 'graphql/index';

import {Nullable} from '../../types';

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
