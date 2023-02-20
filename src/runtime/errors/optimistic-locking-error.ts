import {BaseDataLibraryError} from './base-error';

/**
 * Thrown when the requested item is out of date. use readUserSession to ge the
 * latest version
 */
export class OptimisticLockingError<
  PK extends object,
  TYPENAME extends string
> extends BaseDataLibraryError {
  readonly primaryKey: PK;
  readonly typeName: TYPENAME;

  /** constructor */
  constructor(typeName: TYPENAME, primaryKey: PK) {
    super(
      `${typeName} with specified primaryKey is out of date. Please refresh and try again.`
    );
    this.primaryKey = primaryKey;
    this.typeName = typeName;
  }
}
