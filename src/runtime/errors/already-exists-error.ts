import {BaseDataLibraryError} from './base-error';

/**
 * Similar to OptimisticLockingError, but thrown in the special case of the item
 * already existing when createItem is called.
 */
export class AlreadyExistsError<
  PK extends object
> extends BaseDataLibraryError {
  /** constructor */
  constructor(typeName: string, primaryKey: PK) {
    super(
      `${typeName} with id ${JSON.stringify(
        primaryKey
      )} already exists. Please switch to update${typeName} instead of create${typeName}.`
    );
  }
}
