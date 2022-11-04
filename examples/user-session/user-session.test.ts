import {NotFoundError} from '../../src/lib/not-found-error';
import {OptimisticLockingError} from '../../src/lib/optimistic-locking-error';

import {
  createUserSession,
  deleteUserSession,
  readUserSession,
  touchUserSession,
  updateUserSession,
} from './__generated__/actions';

const userSessionMatcher = {
  createdAt: expect.any(Date),
  expires: expect.any(Date),
  id: expect.any(String),
  updatedAt: expect.any(Date),
};

describe('createUserSession()', () => {
  it('creates a user session', async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    expect(result).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "createdAt": Any<Date>,
        "expires": Any<Date>,
        "id": Any<String>,
        "session": {
          "foo": "foo",
        },
        "updatedAt": Any<Date>,
        "version": 1,
      }
    `
    );

    expect(result.id).toMatch(/UserSession#/);
    expect(result.createdAt.getTime()).not.toBeNaN();
    expect(result.expires.getTime()).not.toBeNaN();
    expect(result.updatedAt.getTime()).not.toBeNaN();

    // cleanup, not part of test
    await deleteUserSession(result.id);
  });
});

describe('deleteUserSession()', () => {
  it('deletes a user session', async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    const deleteResult = await deleteUserSession(result.id);
    expect(deleteResult).toMatchInlineSnapshot(
      {ConsumedCapacity: {TableName: expect.any(String)}},
      `
      {
        "ConsumedCapacity": {
          "CapacityUnits": 1,
          "GlobalSecondaryIndexes": undefined,
          "LocalSecondaryIndexes": undefined,
          "ReadCapacityUnits": undefined,
          "Table": {
            "CapacityUnits": 1,
            "ReadCapacityUnits": undefined,
            "WriteCapacityUnits": undefined,
          },
          "TableName": Any<String>,
          "WriteCapacityUnits": undefined,
        },
        "ItemCollectionMetrics": undefined,
      }
    `
    );

    await expect(async () => await readUserSession(result.id)).rejects.toThrow(
      NotFoundError
    );
  });

  it('throws an error if the user session does not exist', async () => {
    await expect(
      async () => await deleteUserSession('some-id')
    ).rejects.toThrow(NotFoundError);
  });
});

describe('readUserSession()', () => {
  it('reads a user session', async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    const readResult = await readUserSession(result.id);
    expect(readResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "createdAt": Any<Date>,
        "expires": Any<Date>,
        "id": Any<String>,
        "session": {
          "foo": "foo",
        },
        "updatedAt": Any<Date>,
        "version": 1,
      }
    `
    );

    // cleanup, not part of test
    await deleteUserSession(result.id);
  });

  it('throws an error if the user session does not exist', async () => {
    await expect(async () => await readUserSession('some-id')).rejects.toThrow(
      NotFoundError
    );
  });
});

describe('touchUserSession()', () => {
  it("updates a user session's createdAt and extends its ttl", async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    const readResult = await readUserSession(result.id);
    expect(readResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "createdAt": Any<Date>,
        "expires": Any<Date>,
        "id": Any<String>,
        "session": {
          "foo": "foo",
        },
        "updatedAt": Any<Date>,
        "version": 1,
      }
    `
    );

    await touchUserSession(result.id);
    const touchResult = await readUserSession(result.id);
    expect(touchResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "createdAt": Any<Date>,
        "expires": Any<Date>,
        "id": Any<String>,
        "session": {
          "foo": "foo",
        },
        "updatedAt": Any<Date>,
        "version": 2,
      }
    `
    );

    expect(readResult.createdAt).toEqual(touchResult.createdAt);
    expect(readResult.updatedAt).toEqual(touchResult.updatedAt);

    expect(readResult.expires).not.toEqual(touchResult.expires);

    // cleanup, not part of test
    await deleteUserSession(result.id);
  });

  it('throws an error if the user session does not exist', async () => {
    await expect(async () => await touchUserSession('some-id')).rejects.toThrow(
      NotFoundError
    );
  });
});

describe('updateUserSession()', () => {
  it('updates a user session', async () => {
    const createResult = await createUserSession({session: {foo: 'foo'}});
    expect(createResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "createdAt": Any<Date>,
        "expires": Any<Date>,
        "id": Any<String>,
        "session": {
          "foo": "foo",
        },
        "updatedAt": Any<Date>,
        "version": 1,
      }
    `
    );
    expect(createResult.session).toEqual({foo: 'foo'});

    const updateResult = await updateUserSession({
      ...createResult,
      session: {foo: 'bar'},
    });
    expect(updateResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "createdAt": Any<Date>,
        "expires": Any<Date>,
        "id": Any<String>,
        "session": {
          "foo": "bar",
        },
        "updatedAt": Any<Date>,
        "version": 2,
      }
    `
    );
    expect(updateResult.session).toEqual({foo: 'bar'});

    const readResult = await readUserSession(createResult.id);
    expect(readResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "createdAt": Any<Date>,
        "expires": Any<Date>,
        "id": Any<String>,
        "session": {
          "foo": "bar",
        },
        "updatedAt": Any<Date>,
        "version": 2,
      }
    `
    );
    expect(updateResult.session).toEqual({foo: 'bar'});

    expect(readResult.createdAt).toEqual(updateResult.createdAt);
    expect(readResult.updatedAt).toEqual(updateResult.updatedAt);

    // cleanup, not part of test
    await deleteUserSession(createResult.id);
  });

  it('throws an error if the user session does not exist', async () => {
    await expect(
      async () =>
        await updateUserSession({
          id: 'some-id',
          session: {foo: 'foo'},
          version: 0,
        })
    ).rejects.toThrow(NotFoundError);
  });

  it('throws an error if the loaded session data is out of date', async () => {
    const createResult = await createUserSession({session: {foo: 'foo'}});
    await updateUserSession({
      ...createResult,
      session: {foo: 'bar'},
    });

    await expect(
      async () =>
        await updateUserSession({
          ...createResult,
          session: {foo: 'bar'},
        })
    ).rejects.toThrow(OptimisticLockingError);

    // cleanup, not part of test
    await deleteUserSession(createResult.id);
  });
});
