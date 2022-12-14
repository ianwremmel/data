import {BaseDataLibraryError} from './base-error';

/** Thrown when an unexpected error is caught and rethrown. */
export class UnexpectedError extends BaseDataLibraryError {
  /** constructor */
  constructor(cause: unknown) {
    if (cause instanceof Error) {
      super('An unexpected error occurred', {cause});
    } else {
      super(`An unexpected error occurred: ${JSON.stringify(cause)}`);
    }
  }
}
