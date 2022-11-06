/**
 * Thrown when the requested item is out of date. use readUserSession to ge the
 * latest version
 */
export class OptimisticLockingError extends Error {
  /** constructor */
  constructor(typeName: string, id: string) {
    super(
      `${typeName} with id ${id} is out of date. Please refresh and try again.`
    );
  }
}
