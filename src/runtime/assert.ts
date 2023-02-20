// This package is a wrapper around node assert.
// eslint-disable-next-line no-restricted-imports
import nodeAssert, {AssertionError} from 'assert';

type Provider = () => string | Error;

/**
 * Wrapper around Node assert that allows for lazy evaluation of the error and,
 * more importantly, a custom Error class.
 * @param value
 * @param message
 */
export function assert(
  value: unknown,
  message: string | Error | Provider
): asserts value {
  if (typeof message === 'string' || message instanceof Error) {
    nodeAssert.ok(value, message);
  } else {
    try {
      nodeAssert.ok(value);
    } catch (err) {
      const realError = message();
      if (realError instanceof Error) {
        throw realError;
      }
      throw new AssertionError({message: realError});
    }
  }
}

export {fail, strictEqual, notStrictEqual, AssertionError} from 'assert';
