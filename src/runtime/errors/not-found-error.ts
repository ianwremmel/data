import {BaseDataLibraryError} from './base-error';

/** Thrown when the requested item cannot be found */
export class NotFoundError<
  PK extends object,
  TYPENAME extends string
> extends BaseDataLibraryError<{primaryKey: PK; typename: TYPENAME}> {
  readonly primaryKey: PK;
  readonly typeName: TYPENAME;

  /** constructor */
  constructor(typename: TYPENAME, primaryKey: PK) {
    super(`No ${typename} found with specified primaryKey`, {
      telemetry: {primaryKey, typename},
    });
    this.primaryKey = primaryKey;
    this.typeName = typename;
  }
}
