import {BaseDataLibraryError} from './base-error';

/**
 * Similar to OptimisticLockingError, but thrown in the special case of the item
 * already existing when createItem is called.
 */
export class AlreadyExistsError<
  PK extends object,
  TYPENAME extends string
> extends BaseDataLibraryError {
  readonly primaryKey: PK;
  readonly typeName: TYPENAME;

  /** constructor */
  constructor(typeName: TYPENAME, primaryKey: PK) {
    super(
      `${typeName} with specified primaryKey already exists. Please switch to update${typeName} instead of create${typeName}.`
    );
    this.primaryKey = primaryKey;
    this.typeName = typeName;
  }
}
