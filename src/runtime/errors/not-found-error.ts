import {BaseDataLibraryError} from './base-error';

/** Thrown when the requested item cannot be found */
export class NotFoundError<
  PK extends object,
  TYPENAME extends string
> extends BaseDataLibraryError {
  readonly primaryKey: PK;
  readonly typeName: TYPENAME;

  /** constructor */
  constructor(typeName: TYPENAME, primaryKey: PK) {
    super(`No ${typeName} found with specified primaryKey`);
    this.primaryKey = primaryKey;
    this.typeName = typeName;
  }
}
