import {BaseDataLibraryError} from './base-error';

/**
 * Thrown when the requested item is out of date. use readUserSession to ge the
 * latest version
 */
export class OptimisticLockingError<
  PK extends object,
  TYPENAME extends string
> extends BaseDataLibraryError<{primaryKey: PK; typename: TYPENAME}> {
  readonly primaryKey: PK;
  readonly typeName: TYPENAME;

  /** constructor */
  constructor(typename: TYPENAME, primaryKey: PK) {
    super(
      `${typename} with specified primaryKey is out of date. Please refresh and try again.`,
      {telemetry: {primaryKey, typename}}
    );
    this.primaryKey = primaryKey;
    this.typeName = typename;
  }
}
