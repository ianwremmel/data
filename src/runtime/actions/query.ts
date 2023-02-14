/** Generates a sort key for use with query() */
export function makeSortKeyForQuery(
  prefix: string,
  fields: readonly string[],
  input: object
) {
  let sortKey = prefix;
  for (const field of fields) {
    if (field in input) {
      // @ts-expect-error
      sortKey += `#${input[field]}`;
    } else {
      break;
    }
  }
  return sortKey;
}
