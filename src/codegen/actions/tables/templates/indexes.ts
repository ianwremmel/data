import type {PrimaryKeyConfig, SecondaryIndex} from '../../../parser';

import {makeKeyTemplate} from './helpers';

/** Indicates if an index contains a particular field name */
export function indexHasField(
  name: string,
  primaryKey: PrimaryKeyConfig,
  index: SecondaryIndex
) {
  if (index.isSingleField) {
    return index.name === name;
  }

  if (index.type === 'lsi') {
    return (
      primaryKey.partitionKeyFields.some((field) => field.fieldName === name) ||
      index.sortKeyFields.some((field) => field.fieldName === name)
    );
  }

  if (index.isComposite) {
    return (
      index.partitionKeyFields.some((field) => field.fieldName === name) ||
      index.sortKeyFields.some((field) => field.fieldName === name)
    );
  }

  return index.partitionKeyFields.some((field) => field.fieldName === name);
}

/** helper */
export function indexToUpdateExpressionPart({
  isSingleField,
  name,
  type,
}: SecondaryIndex) {
  return type === 'gsi'
    ? isSingleField
      ? []
      : [`'#${name}pk = :${name}pk',`, `'#${name}sk = :${name}sk',`]
    : [`'#${name}sk = :${name}sk',`];
}

/** helper */
export function indexToEAVPart(
  mode: 'blind' | 'create' | 'read',
  index: SecondaryIndex
) {
  if (index.type === 'gsi') {
    if (index.isSingleField) {
      return [];
    }
    return [
      `':${`${index.name}pk`}': ${makeKeyTemplate(
        index.partitionKeyPrefix,
        index.partitionKeyFields,
        mode
      )},`,
      index.isComposite
        ? `':${index.name}sk': ${makeKeyTemplate(
            index.sortKeyPrefix,
            index.sortKeyFields,
            mode
          )},`
        : undefined,
    ];
  }

  return [
    `':${index.name}sk': ${makeKeyTemplate(
      index.sortKeyPrefix,
      index.sortKeyFields,
      mode
    )},`,
  ];
}

/** helper */
export function indexToEANPart({isSingleField, name, type}: SecondaryIndex) {
  return type === 'gsi'
    ? isSingleField
      ? []
      : [`'#${name}pk': '${name}pk',`, `'#${name}sk': '${name}sk',`]
    : [`'#${name}sk': '${name}sk',`];
}
