import {faker} from '@faker-js/faker';
import {NotFoundError, OptimisticLockingError} from '@ianwremmel/data';
import Base64 from 'base64url';

import {
  blindWriteUserSession,
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
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
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

    expect(Base64.decode(result.item.id)).toMatchInlineSnapshot(
      `"UserSession:USER_SESSION#181c887c-e7df-4331-9fba-65d255867e20"`
    );

    expect(result.item.createdAt.getTime()).not.toBeNaN();
    expect(result.item.expires.getTime()).not.toBeNaN();
    expect(result.item.updatedAt.getTime()).not.toBeNaN();

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });

  it('creates a record with a custom expiration Date', async () => {
    const expires = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const result = await createUserSession({
      expires,
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    expect(result.item.expires.getTime()).not.toBeNaN();

    expect(result.item.expires).toStrictEqual(expires);

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });

  it('creates a record with a custom expiration Date that is undefined', async () => {
    const expires = undefined;

    const result = await createUserSession({
      expires,
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    expect(result.item.expires.getTime()).not.toBeNaN();

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });
});

describe('blindWriteUserSession()', () => {
  it('creates a user session if it does not exist', async () => {
    const result = await blindWriteUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    try {
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
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
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

      expect(Base64.decode(result.item.id)).toMatchInlineSnapshot(
        `"UserSession:USER_SESSION#181c887c-e7df-4331-9fba-65d255867e20"`
      );

      expect(result.item.createdAt.getTime()).not.toBeNaN();
      expect(result.item.expires.getTime()).not.toBeNaN();
      expect(result.item.updatedAt.getTime()).not.toBeNaN();
      expect(result.item.version).toBe(1);
    } finally {
      // cleanup, not part of test
      await deleteUserSession(result.item);
    }
  });

  it('creates a user session with a custom expiration date if it does not exist', async () => {
    const expires = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const result = await blindWriteUserSession({
      expires,
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    expect(result.item.expires.getTime()).not.toBeNaN();

    expect(result.item.expires).toStrictEqual(expires);
    expect(result.item.version).toBe(1);

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });

  it('creates a user session with a custom expiration date that is undefined if it does not exist', async () => {
    const expires = undefined;

    const result = await blindWriteUserSession({
      expires,
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    expect(result.item.expires.getTime()).not.toBeNaN();

    expect(result.item.version).toBe(1);

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });

  it('overwrites an existing record', async () => {
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
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
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
    expect(createResult.item.version).toBe(1);

    const item = {...createResult.item};
    // @ts-expect-error
    delete item.version;
    const updateResult = await blindWriteUserSession({
      ...item,
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
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
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
    expect(updateResult.item.version).toBe(2);

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
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
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

  it('overwrites an existing record with a custom expiration Date', async () => {
    const expires = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const createResult = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    expect(createResult.item.expires).not.toBe(expires);
    expect(createResult.item.version).toBe(1);

    const updateResult = await blindWriteUserSession({
      ...createResult.item,
      expires,
      session: {foo: 'bar'},
    });

    expect(updateResult.item.expires).toStrictEqual(expires);
    expect(updateResult.item.version).toBe(2);

    const readResult = await readUserSession(createResult.item);
    expect(readResult.item.expires).toStrictEqual(expires);

    // cleanup, not part of test
    await deleteUserSession(createResult.item);
  });

  it('overwrites an existing record with a custom expiration Date that does not exist', async () => {
    const expires = undefined;

    const createResult = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    expect(createResult.item.expires).not.toBe(expires);
    expect(createResult.item.version).toBe(1);

    const updateResult = await blindWriteUserSession({
      ...createResult.item,
      expires,
      session: {foo: 'bar'},
    });

    expect(updateResult.item.version).toBe(2);

    const readResult = await readUserSession(createResult.item);

    // cleanup, not part of test
    await deleteUserSession(createResult.item);
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
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
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
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
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
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
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
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
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
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
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
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
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

  it('updates a record with a custom expiration Date', async () => {
    const expires = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const createResult = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    expect(createResult.item.expires).not.toBe(expires);

    const updateResult = await updateUserSession({
      ...createResult.item,
      expires,
      session: {foo: 'bar'},
    });

    expect(updateResult.item.expires).toStrictEqual(expires);

    const readResult = await readUserSession(createResult.item);
    expect(readResult.item.expires).toStrictEqual(expires);

    // cleanup, not part of test
    await deleteUserSession(createResult.item);
  });

  it('updates a record with a custom expiration Date that does not exist', async () => {
    const expires = undefined;

    const createResult = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    const updateResult = await updateUserSession({
      ...createResult.item,
      expires,
      session: {foo: 'bar'},
    });

    const readResult = await readUserSession(createResult.item);

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
