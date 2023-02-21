import {BaseDataLibraryError} from './base-error';

/** Thrown when an unexpected error is caught and rethrown. */
export class UnexpectedError extends BaseDataLibraryError<object> {
  /** constructor */
  constructor(cause: unknown) {
    super('An unexpected error occurred', {cause, telemetry: {}});
  }
}
