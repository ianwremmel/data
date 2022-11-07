import {NotFoundError, OptimisticLockingError} from '../../src/lib';

import {
  createUserSession,
  deleteUserSession,
  readUserSession,
  touchUserSession,
  updateUserSession,
} from './__generated__/actions';

const userSessionMatcher = {
  capacity: {TableName: expect.any(String)},
  item: {
    createdAt: expect.any(Date),
    expires: expect.any(Date),
    id: expect.any(String),
    updatedAt: expect.any(Date),
  },
};
describe('createUserSession()', () => {
  it('creates a record', async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    expect(result).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "capacity": {
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
        "item": {
          "createdAt": Any<Date>,
          "expires": Any<Date>,
          "id": Any<String>,
          "session": {
            "foo": "foo",
          },
          "updatedAt": Any<Date>,
          "version": 1,
        },
        "metrics": undefined,
      }
    `
    );

    expect(result.item.id).toMatch(/UserSession#/);
    expect(result.item.createdAt.getTime()).not.toBeNaN();
    expect(result.item.expires.getTime()).not.toBeNaN();
    expect(result.item.updatedAt.getTime()).not.toBeNaN();

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });
});

describe('deleteUserSession()', () => {
  it('deletes a record', async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    const deleteResult = await deleteUserSession(result.item);
    expect(deleteResult).toMatchInlineSnapshot(
      {capacity: {TableName: expect.any(String)}},
      `
      {
        "capacity": {
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
        "item": undefined,
        "metrics": undefined,
      }
    `
    );

    await expect(
      async () => await readUserSession(result.item)
    ).rejects.toThrow(NotFoundError);
  });

  it('throws an error if the record does not exist', async () => {
    await expect(
      async () => await deleteUserSession({id: 'some-id'})
    ).rejects.toThrow(NotFoundError);
  });
});

describe('readUserSession()', () => {
  it('reads a record', async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    const readResult = await readUserSession(result.item);
    expect(readResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "capacity": {
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
        "item": {
          "createdAt": Any<Date>,
          "expires": Any<Date>,
          "id": Any<String>,
          "session": {
            "foo": "foo",
          },
          "updatedAt": Any<Date>,
          "version": 1,
        },
        "metrics": undefined,
      }
    `
    );

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });

  it('throws an error if the record does not exist', async () => {
    await expect(
      async () => await readUserSession({id: 'some-id'})
    ).rejects.toThrow(NotFoundError);
  });
});

describe('touchUserSession()', () => {
  it("updates a record's createdAt and extends its ttl", async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    const readResult = await readUserSession(result.item);
    expect(readResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "capacity": {
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
        "item": {
          "createdAt": Any<Date>,
          "expires": Any<Date>,
          "id": Any<String>,
          "session": {
            "foo": "foo",
          },
          "updatedAt": Any<Date>,
          "version": 1,
        },
        "metrics": undefined,
      }
    `
    );

    await touchUserSession(result.item);
    const touchResult = await readUserSession(result.item);
    expect(touchResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "capacity": {
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
        "item": {
          "createdAt": Any<Date>,
          "expires": Any<Date>,
          "id": Any<String>,
          "session": {
            "foo": "foo",
          },
          "updatedAt": Any<Date>,
          "version": 2,
        },
        "metrics": undefined,
      }
    `
    );

    expect(readResult.item.createdAt).toEqual(touchResult.item.createdAt);
    expect(readResult.item.updatedAt).toEqual(touchResult.item.updatedAt);

    expect(readResult.item.expires).not.toEqual(touchResult.item.expires);

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });

  it('throws an error if the record does not exist', async () => {
    await expect(
      async () => await touchUserSession({id: 'some-id'})
    ).rejects.toThrow(NotFoundError);
  });
});

describe('updateUserSession()', () => {
  it('updates a record', async () => {
    const createResult = await createUserSession({session: {foo: 'foo'}});
    expect(createResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "capacity": {
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
        "item": {
          "createdAt": Any<Date>,
          "expires": Any<Date>,
          "id": Any<String>,
          "session": {
            "foo": "foo",
          },
          "updatedAt": Any<Date>,
          "version": 1,
        },
        "metrics": undefined,
      }
    `
    );
    expect(createResult.item.session).toEqual({foo: 'foo'});

    const updateResult = await updateUserSession({
      ...createResult.item,
      session: {foo: 'bar'},
    });
    expect(updateResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "capacity": {
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
        "item": {
          "createdAt": Any<Date>,
          "expires": Any<Date>,
          "id": Any<String>,
          "session": {
            "foo": "bar",
          },
          "updatedAt": Any<Date>,
          "version": 2,
        },
        "metrics": undefined,
      }
    `
    );
    expect(updateResult.item.session).toEqual({foo: 'bar'});

    const readResult = await readUserSession(createResult.item);
    expect(readResult).toMatchInlineSnapshot(
      userSessionMatcher,
      `
      {
        "capacity": {
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
        "item": {
          "createdAt": Any<Date>,
          "expires": Any<Date>,
          "id": Any<String>,
          "session": {
            "foo": "bar",
          },
          "updatedAt": Any<Date>,
          "version": 2,
        },
        "metrics": undefined,
      }
    `
    );
    expect(updateResult.item.session).toEqual({foo: 'bar'});

    expect(readResult.item.createdAt).toEqual(updateResult.item.createdAt);
    expect(readResult.item.updatedAt).toEqual(updateResult.item.updatedAt);

    // cleanup, not part of test
    await deleteUserSession(createResult.item);
  });

  it('throws an error if the record does not exist', async () => {
    await expect(
      async () =>
        await updateUserSession({
          id: 'some-id',
          session: {foo: 'foo'},
          version: 0,
        })
    ).rejects.toThrow(NotFoundError);
  });

  it('throws an error if the loaded record is out of date', async () => {
    const createResult = await createUserSession({session: {foo: 'foo'}});
    await updateUserSession({
      ...createResult.item,
      session: {foo: 'bar'},
    });

    await expect(
      async () =>
        await updateUserSession({
          ...createResult.item,
          session: {foo: 'bar'},
        })
    ).rejects.toThrow(OptimisticLockingError);

    // cleanup, not part of test
    await deleteUserSession(createResult.item);
  });
});
