import {runWithNewSpan} from '@code-like-a-carpenter/telemetry';

import {AlreadyExistsError, OptimisticLockingError} from '../../errors';

export type VoidCallback = () => Promise<void>;

/**
 * Retries a callback up to 3 times in event of data freshness errors.
 */
export async function retry(cb: VoidCallback) {
  const maxAttempts = 5;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await runWithNewSpan(
        'retry',
        {
          attributes: {
            'com.code-like-a-carpenter.data.attempt': i,
            'com.code-like-a-carpenter.data.total_attempts': maxAttempts,
          },
        },
        cb
      );
      // terminate loop early because we've succeeded.
      return;
    } catch (err) {
      if (
        err instanceof AlreadyExistsError ||
        err instanceof OptimisticLockingError
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, (i + 1) * (1 + 1) * 1000)
        );
      } else {
        throw err;
      }
    }
  }
}
