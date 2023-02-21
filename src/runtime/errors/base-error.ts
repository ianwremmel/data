import {Exception} from '@code-like-a-carpenter/exception';

/** Base error class that all errors must derive from */
export class BaseDataLibraryError<T extends object> extends Exception<T> {}
