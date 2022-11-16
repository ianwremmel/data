import {faker} from '@faker-js/faker';

import {NotFoundError, OptimisticLockingError} from '../../src/runtime';

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
  updatedAt: expect.any(Date),
};

const itemMatcher = {
  capacity: {TableName: expect.any(String)},
  item: userSessionMatcher,
};

describe('createUserSession()', () => {
  it('creates a record', async () => {
    const result = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    expect(result).toMatchInlineSnapshot(
      itemMatcher,
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
          "id": "USER_SESSION#181c887c-e7df-4331-9fba-65d255867e20}",
          "session": {
            "foo": "foo",
          },
          "sessionId": "181c887c-e7df-4331-9fba-65d255867e20",
          "updatedAt": Any<Date>,
          "version": 1,
        },
        "metrics": undefined,
      }
    `
    );

    expect(result.item.createdAt.getTime()).not.toBeNaN();
    expect(result.item.expires.getTime()).not.toBeNaN();
    expect(result.item.updatedAt.getTime()).not.toBeNaN();

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });
});

describe('deleteUserSession()', () => {
  it('deletes a record', async () => {
    const result = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

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
      async () => await deleteUserSession({sessionId: 'some-id'})
    ).rejects.toThrow(NotFoundError);
  });
});

describe('readUserSession()', () => {
  it('reads a record', async () => {
    const result = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    const readResult = await readUserSession(result.item);
    expect(readResult).toMatchInlineSnapshot(
      itemMatcher,
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
          "id": "USER_SESSION#181c887c-e7df-4331-9fba-65d255867e20}",
          "session": {
            "foo": "foo",
          },
          "sessionId": "181c887c-e7df-4331-9fba-65d255867e20",
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
      async () => await readUserSession({sessionId: 'some-id'})
    ).rejects.toThrow(NotFoundError);
  });
});

describe('touchUserSession()', () => {
  it("updates a record's createdAt and extends its ttl", async () => {
    const result = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    const readResult = await readUserSession(result.item);
    expect(readResult).toMatchInlineSnapshot(
      itemMatcher,
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
          "id": "USER_SESSION#181c887c-e7df-4331-9fba-65d255867e20}",
          "session": {
            "foo": "foo",
          },
          "sessionId": "181c887c-e7df-4331-9fba-65d255867e20",
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
      itemMatcher,
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
          "id": "USER_SESSION#181c887c-e7df-4331-9fba-65d255867e20}",
          "session": {
            "foo": "foo",
          },
          "sessionId": "181c887c-e7df-4331-9fba-65d255867e20",
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
      async () => await touchUserSession({sessionId: 'some-id'})
    ).rejects.toThrow(NotFoundError);
  });
});

describe('updateUserSession()', () => {
  it('updates a record', async () => {
    const createResult = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });
    expect(createResult).toMatchInlineSnapshot(
      itemMatcher,
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
          "id": "USER_SESSION#181c887c-e7df-4331-9fba-65d255867e20}",
          "session": {
            "foo": "foo",
          },
          "sessionId": "181c887c-e7df-4331-9fba-65d255867e20",
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
      itemMatcher,
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
          "id": "USER_SESSION#181c887c-e7df-4331-9fba-65d255867e20}",
          "session": {
            "foo": "bar",
          },
          "sessionId": "181c887c-e7df-4331-9fba-65d255867e20",
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
      itemMatcher,
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
          "id": "USER_SESSION#181c887c-e7df-4331-9fba-65d255867e20}",
          "session": {
            "foo": "bar",
          },
          "sessionId": "181c887c-e7df-4331-9fba-65d255867e20",
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
          session: {foo: 'foo'},
          sessionId: 'some-id',
          version: 0,
        })
    ).rejects.toThrow(NotFoundError);
  });

  it('throws an error if the loaded record is out of date', async () => {
    const createResult = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });
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
