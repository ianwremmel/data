import {BaseDataLibraryError} from './base-error';

/**
 * Similar to OptimisticLockingError, but thrown in the special case of the item
 * already existing when createItem is called.
 */
export class AlreadyExistsError<
  PK extends object,
  TYPENAME extends string
> extends BaseDataLibraryError<{primaryKey: PK; typename: TYPENAME}> {
  readonly primaryKey: PK;
  readonly typeName: TYPENAME;

  /** constructor */
  constructor(typename: TYPENAME, primaryKey: PK) {
    super(
      `${typename} with specified primaryKey already exists. Please switch to update${typename} instead of create${typename}.`,
      {telemetry: {primaryKey, typename}}
    );
    this.primaryKey = primaryKey;
    this.typeName = typename;
  }
}
