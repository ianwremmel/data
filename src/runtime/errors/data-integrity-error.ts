import {BaseDataLibraryError} from './base-error';

/**
 * Thrown when unmarsahlling an item finds a missing but required field or
 * unexpected data type
 */
export class DataIntegrityError extends BaseDataLibraryError {}
