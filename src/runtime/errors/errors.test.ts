import {ServiceException} from '@aws-sdk/smithy-client';

import {AlreadyExistsError} from './already-exists-error';
import {NotFoundError} from './not-found-error';
import {OptimisticLockingError} from './optimistic-locking-error';
import {UnexpectedAwsError} from './unexpected-aws-error';
import {UnexpectedError} from './unexpected-error';

describe('AlreadyExistsError', () => {
  it('stringifies', () => {
    const err = new AlreadyExistsError('User', {id: '123'});
    expect(err).toMatchInlineSnapshot(
      `[Error: User with id {"id":"123"} already exists. Please switch to updateUser instead of createUser.]`
    );
    expect(err.cause).toMatchInlineSnapshot(`undefined`);
  });
});

describe('NotFoundError', () => {
  it('stringifies', () => {
    const err = new NotFoundError('User', {id: '123'});
    expect(err).toMatchInlineSnapshot(
      `[Error: No User found with id {"id":"123"}]`
    );
    expect(err.cause).toMatchInlineSnapshot(`undefined`);
  });
});

describe('OptimisticLockingError', () => {
  it('stringifies', () => {
    const err = new OptimisticLockingError('User', {id: '123'});
    expect(err).toMatchInlineSnapshot(
      `[Error: User with id {"id":"123"} is out of date. Please refresh and try again.]`
    );
    expect(err.cause).toMatchInlineSnapshot(`undefined`);
  });
});

describe('UnexpectedAwsError', () => {
  it('stringifies', () => {
    const err = new UnexpectedAwsError(
      new ServiceException({
        $fault: 'client',
        $metadata: {
          requestId: '123',
        },
        $retryable: {
          throttling: true,
        },
        $service: 'fake',
        message: 'Something bad happened',
        name: 'FakeAwsError',
      })
    );
    expect(err).toMatchInlineSnapshot(
      `[Error: The AWS SDK threw an unexpected error]`
    );
    expect(err.cause).toMatchInlineSnapshot(
      `[FakeAwsError: Something bad happened]`
    );
  });
});

describe('UnexpectedError', () => {
  it('stringifies', () => {
    const err = new UnexpectedError(new Error('Something bad happened'));
    expect(err).toMatchInlineSnapshot(`[Error: An unexpected error occurred]`);
    expect(err.cause).toMatchInlineSnapshot(`[Error: Something bad happened]`);
  });
});
