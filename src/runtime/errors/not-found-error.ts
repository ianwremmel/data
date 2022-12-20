import {BaseDataLibraryError} from './base-error';

/** Thrown when the requested item cannot be found */
export class NotFoundError<PK extends object> extends BaseDataLibraryError {
  /** constructor */
  constructor(typeName: string, primaryKey: PK) {
    super(`No ${typeName} found with id ${JSON.stringify(primaryKey)}`);
  }
}
