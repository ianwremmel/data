import {BaseDataLibraryError} from './base-error';

/**
 * Thrown when unmarshalling an item finds a missing but required field or
 * unexpected data type
 */
export class DataIntegrityError extends BaseDataLibraryError<object> {
  /** constructor */
  constructor(message: string) {
    super(message, {telemetry: {}});
  }
}
