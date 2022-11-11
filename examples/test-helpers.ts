/**
 * Retries the wrapper operation until it returns without throwing or the
 * timeout is hit.
 */
export async function waitFor<T>(
  fn: () => Promise<T>,
  timeout = 1.5 * 60 * 1000
) {
  const start = Date.now();
  while (Date.now() - start < timeout * 2) {
    try {
      return await fn();
    } catch (err) {
      if (Date.now() - start < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw err;
      }
    }
  }
  throw new Error('fn did not succeed within timeout');
}
