/** Typesafe function for .filter to remove undefined or null values */
export function filterNull<T>(x: T | undefined | null): x is T {
  return Boolean(x);
}
