import {BaseDataLibraryError} from './base-error';

/**
 * Thrown when the requested item is out of date. use readUserSession to ge the
 * latest version
 */
export class OptimisticLockingError<
  PK extends object
> extends BaseDataLibraryError {
  /** constructor */
  constructor(typeName: string, primaryKey: PK) {
    super(
      `${typeName} with id ${JSON.stringify(
        primaryKey
      )} is out of date. Please refresh and try again.`
    );
  }
}
