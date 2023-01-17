import assert from 'assert';

import {UpdateCommand, GetCommand} from '@aws-sdk/lib-dynamodb';
import {faker} from '@faker-js/faker';
import Base64 from 'base64url';

import {ddbDocClient, idGenerator} from '../dependencies';
import {load} from '../test-helpers';

import {
  createAccount,
  createRepository,
  createUserSession,
  deleteAccount,
  deleteUserSession,
  queryRepository,
  queryUserSessionByPublicId,
  readUserSession,
  updateAccount,
  updateUserSession,
} from './__generated__/actions';

const userSessionMatcher = {
  createdAt: expect.any(Date),
  publicId: expect.any(String),
  updatedAt: expect.any(Date),
};

const expiringUserSessionMatcher = {
  ...userSessionMatcher,
  expires: expect.any(Date),
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
    try {
      expect(createResult).toMatchInlineSnapshot(
        itemMatcher,
        `
        {
          "capacity": {
            "CapacityUnits": 2,
            "GlobalSecondaryIndexes": {
              "publicId": {
                "CapacityUnits": 1,
                "ReadCapacityUnits": undefined,
                "WriteCapacityUnits": undefined,
              },
            },
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
            "computedField": "a computed value",
            "createdAt": Any<Date>,
            "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
            "publicId": Any<String>,
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
            "CapacityUnits": 2,
            "GlobalSecondaryIndexes": {
              "publicId": {
                "CapacityUnits": 1,
                "ReadCapacityUnits": undefined,
                "WriteCapacityUnits": undefined,
              },
            },
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
            "computedField": "a computed value",
            "createdAt": Any<Date>,
            "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
            "publicId": Any<String>,
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
            "computedField": "a computed value",
            "createdAt": Any<Date>,
            "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
            "publicId": Any<String>,
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
    } finally {
      // cleanup, not part of test
      await deleteUserSession(createResult.item);
    }
  });
});

describe('optional ttl', () => {
  it('allows creating an item without a ttl value', async () => {
    const result = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    expect(result).toMatchInlineSnapshot(
      itemMatcher,
      `
      {
        "capacity": {
          "CapacityUnits": 2,
          "GlobalSecondaryIndexes": {
            "publicId": {
              "CapacityUnits": 1,
              "ReadCapacityUnits": undefined,
              "WriteCapacityUnits": undefined,
            },
          },
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
          "computedField": "a computed value",
          "createdAt": Any<Date>,
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
          "publicId": Any<String>,
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
    expect(result.item.expires).toBeUndefined();
    expect(result.item.updatedAt.getTime()).not.toBeNaN();

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });

  it('allows creating an item with a ttl value', async () => {
    const result = await createUserSession({
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    expect(result).toMatchInlineSnapshot(
      {...itemMatcher, item: expiringUserSessionMatcher},
      `
      {
        "capacity": {
          "CapacityUnits": 2,
          "GlobalSecondaryIndexes": {
            "publicId": {
              "CapacityUnits": 1,
              "ReadCapacityUnits": undefined,
              "WriteCapacityUnits": undefined,
            },
          },
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
          "computedField": "a computed value",
          "createdAt": Any<Date>,
          "expires": Any<Date>,
          "id": "VXNlclNlc3Npb246VVNFUl9TRVNTSU9OIzE4MWM4ODdjLWU3ZGYtNDMzMS05ZmJhLTY1ZDI1NTg2N2UyMA",
          "publicId": Any<String>,
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
    expect(result.item.expires?.getTime()).not.toBeNaN();
    expect(result.item.updatedAt.getTime()).not.toBeNaN();

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });
});

describe('@alias', () => {
  it("changes field's column name", async () => {
    async function loadRaw(sessionId: string) {
      const {Item: item} = await ddbDocClient.send(
        new GetCommand({
          ConsistentRead: true,
          Key: {pk: `USER_SESSION#${sessionId}`},
          ReturnConsumedCapacity: 'INDEXES',
          TableName: process.env.TABLE_USER_SESSIONS,
        })
      );
      assert(item);
      return item;
    }

    const createResult = await createUserSession({
      aliasedField: 'foo',
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    const createRaw = await loadRaw(createResult.item.sessionId);
    expect(createRaw.renamedField).toBe(createResult.item.aliasedField);
    expect(createRaw.aliasedField).toBeUndefined();

    const readResult1 = await readUserSession(createResult.item);
    expect(readResult1.item.aliasedField).toBe('foo');

    const updateResult = await updateUserSession({
      ...createResult.item,
      aliasedField: 'bar',
    });
    const updateRaw = await loadRaw(updateResult.item.sessionId);
    expect(updateRaw.renamedField).toBe(updateResult.item.aliasedField);
    expect(updateRaw.aliasedField).toBeUndefined();

    const readResult2 = await readUserSession(createResult.item);
    expect(readResult2.item.aliasedField).toBe('bar');

    // cleanup, not part of test
    await deleteUserSession(createResult.item);
  });
});

describe('PublicModel', () => {
  it('can be queried by public id', async () => {
    const result = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    const queriedResult = await queryUserSessionByPublicId(
      result.item.publicId
    );

    expect(queriedResult.item).toStrictEqual(result.item);

    // cleanup, not part of test
    await deleteUserSession(result.item);
  });
});

describe('@simpleIndex', () => {
  it('creates a gsi for a single field', async () => {
    const token = faker.datatype.uuid();

    const createResult = await createRepository({
      externalAccountId: String(faker.datatype.number()),
      externalId: String(faker.datatype.number()),
      externalInstallationId: String(faker.datatype.number()),
      organization: faker.internet.userName(),
      repo: faker.random.word(),
      token,
      vendor: 'GITHUB',
    });

    const queryResult = await queryRepository({
      index: 'token',
      token,
    });

    expect(queryResult.items).toHaveLength(1);
    expect(queryResult.items[0]).toStrictEqual(createResult.item);
  });
});

describe('@computed', () => {
  it("computes a field's value on write", async () => {
    const createResult = await createUserSession({
      session: {foo: 'foo'},
      sessionId: faker.datatype.uuid(),
    });

    try {
      const tableName = process.env.TABLE_USER_SESSIONS;
      assert(tableName, 'TABLE_USER_SESSIONS is not set');

      const raw = await load({
        pk: `USER_SESSION#${createResult.item.sessionId}`,
        tableName,
      });

      expect(raw.Item?.computed_field).toMatchInlineSnapshot(
        `"a computed value"`
      );

      const readResult = await readUserSession(createResult.item);

      expect(readResult.item.computedField).toMatchInlineSnapshot(
        `"a computed value"`
      );
    } finally {
      await deleteUserSession(createResult.item);
    }
  });

  it("computes a field's value on read", async () => {
    const sessionId = faker.datatype.uuid();

    const tableName = process.env.TABLE_USER_SESSIONS;
    assert(tableName, 'TABLE_USER_SESSIONS is not set');
    const now = new Date();

    await ddbDocClient.send(
      new UpdateCommand({
        ConditionExpression: 'attribute_not_exists(#pk)',
        ExpressionAttributeNames: {
          '#createdAt': '_ct',
          '#entity': '_et',
          '#expires': 'ttl',
          '#pk': 'pk',
          '#publicId': 'publicId',
          '#session': 'session',
          '#sessionId': 'session_id',
          '#updatedAt': '_md',
          '#version': '_v',
        },
        ExpressionAttributeValues: {
          ':createdAt': now.getTime(),
          ':entity': 'UserSession',
          ':expires': now.getTime() + 1000 * 60 * 60 * 24 * 30,
          ':publicId': idGenerator(),
          ':session': {foo: 'foo'},
          ':sessionId': sessionId,
          ':updatedAt': now.getTime(),
          ':version': 0,
        },
        Key: {pk: `USER_SESSION#${sessionId}`},
        ReturnConsumedCapacity: 'INDEXES',
        ReturnItemCollectionMetrics: 'SIZE',
        ReturnValues: 'ALL_NEW',
        TableName: tableName,
        UpdateExpression: `SET #entity = :entity, #expires = :expires, #session = :session, #sessionId = :sessionId, #updatedAt = :updatedAt, #version = :version, #createdAt = :createdAt, #publicId = :publicId`,
      })
    );

    try {
      const readResult = await readUserSession({sessionId});

      expect(readResult.item.computedField).toMatchInlineSnapshot(
        `"a computed value"`
      );
    } finally {
      await deleteUserSession({sessionId});
    }
  });

  it('uses a virtual fields to support indexes without writing them to the database', async () => {
    const createResult = await createAccount({
      cancelled: false,
      effectiveDate: faker.date.past(),
      externalId: String(faker.datatype.number()),
      hasEverSubscribed: true,
      onFreeTrial: false,
      planName: 'ENTERPRISE',
      vendor: 'GITHUB',
    });
    try {
      const tableName = process.env.TABLE_ACCOUNT;
      assert(tableName, 'TABLE_ACCOUNT is not set');

      const rawCreateResult = await load({
        pk: `ACCOUNT#${createResult.item.vendor}#${createResult.item.externalId}`,
        sk: `SUMMARY`,
        tableName,
      });

      expect(rawCreateResult.Item?.indexed_plan_name).toBeUndefined();
      expect(rawCreateResult.Item?.gsi1sk).toMatchInlineSnapshot(
        `"PLAN#false#ENTERPRISE"`
      );

      const updateResult = await updateAccount({
        ...createResult.item,
        planName: 'OPEN_SOURCE',
      });

      const rawUpdateResult = await load({
        pk: `ACCOUNT#${createResult.item.vendor}#${createResult.item.externalId}`,
        sk: `SUMMARY`,
        tableName,
      });

      expect(rawUpdateResult.Item?.indexed_plan_name).toBeUndefined();
      expect(rawUpdateResult.Item?.gsi1sk).toMatchInlineSnapshot(
        `"PLAN#false#OPEN_SOURCE"`
      );

      await updateAccount({
        ...updateResult.item,
        cancelled: true,
        lastPlanName: 'OPEN_SOURCE',
        planName: null,
      });

      const rawUpdate2Result = await load({
        pk: `ACCOUNT#${createResult.item.vendor}#${createResult.item.externalId}`,
        sk: `SUMMARY`,
        tableName,
      });

      expect(rawUpdate2Result.Item?.indexed_plan_name).toBeUndefined();
      expect(rawUpdate2Result.Item?.gsi1sk).toMatchInlineSnapshot(
        `"PLAN#true#OPEN_SOURCE"`
      );
    } finally {
      await deleteAccount(createResult.item);
    }
  });
});
