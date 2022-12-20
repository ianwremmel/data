import type {ServiceException} from '@aws-sdk/smithy-client';

import {BaseDataLibraryError} from './base-error';

/**
 * Thrown when an error is caught from the AWS SDK that we didn't expecte to
 * have to handle.
 */
export class UnexpectedAwsError extends BaseDataLibraryError {
  /** constructor */
  constructor(cause: ServiceException) {
    super('The AWS SDK threw an unexpected error', {cause});
  }
}
