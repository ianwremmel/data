import {faker} from '@faker-js/faker';

import {
  createUserSession,
  deleteUserSession,
  readUserSession,
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

describe('optionalFields', () => {
  it("doesn't prevent the record from being written when not present", async () => {
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
});
