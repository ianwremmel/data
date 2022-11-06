/** Thrown when the requested item cannot befound */
export class NotFoundError extends Error {
  /** constructor */
  constructor(typeName: string, id: string) {
    super(`No ${typeName} found with id ${id}`);
  }
}
