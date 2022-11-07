/** Thrown when the requested item cannot be found */
export class NotFoundError<PK extends object> extends Error {
  /** constructor */
  constructor(typeName: string, primaryKey: PK) {
    super(`No ${typeName} found with id ${JSON.stringify(primaryKey)}`);
  }
}
