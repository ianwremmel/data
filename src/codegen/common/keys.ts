import type {GraphQLField} from 'graphql';

import type {Field} from '../parser';

import {marshalField} from './helpers';

/** Generates the template for producing the desired primary key or index column */
export function makeKeyTemplate(
  prefix: string,
  fields: readonly GraphQLField<unknown, unknown>[] | readonly Field[]
): string {
  return [
    prefix,
    ...fields.map((field) => {
      const fieldName = 'fieldName' in field ? field.fieldName : field.name;
      const isDateType = 'isDateType' in field ? field.isDateType : false;
      if (fieldName === 'createdAt' || fieldName === 'updatedAt') {
        // this template gets passed through so it's available in the output.
        // eslint-disable-next-line no-template-curly-in-string
        return '${now.getTime()}';
      }
      return `\${${marshalField(fieldName, isDateType)}}`;
    }),
  ].join('#');
}
