import {faker} from '@faker-js/faker';

import {NotFoundError, OptimisticLockingError} from '../../src/lib';

import {
  createUserLogin,
  deleteUserLogin,
  queryUserLogin,
  readUserLogin,
  touchUserLogin,
  updateUserLogin,
} from './__generated__/actions';

const userLoginMatcher = {
  capacity: {TableName: expect.any(String)},
  item: {
    createdAt: expect.any(Date),
    id: expect.any(String),
    updatedAt: expect.any(Date),
  },
};

faker.seed(1701);

describe('createUserLogin()', () => {
  it('creates a record', async () => {
    const result = await createUserLogin({
      externalId: String(faker.datatype.number()),
      login: faker.internet.userName(),
      vendor: 'GITHUB',
    });

    expect(result).toMatchInlineSnapshot(
      userLoginMatcher,
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
          "externalId": "8943",
          "id": Any<String>,
          "login": "Joshuah_Buckridge53",
          "updatedAt": Any<Date>,
          "vendor": "GITHUB",
          "version": 1,
        },
        "metrics": undefined,
      }
    `
    );

    expect(result.item.id).toMatchInlineSnapshot(
      `"USER#GITHUB#8943#LOGIN#Joshuah_Buckridge53"`
    );
    expect(result.item.createdAt.getTime()).not.toBeNaN();

    expect(result.item.updatedAt.getTime()).not.toBeNaN();

    // cleanup, not part of test
    await deleteUserLogin(result.item);
  });
});

describe('deleteUserLogin()', () => {
  it('deletes a record', async () => {
    const result = await createUserLogin({
      externalId: String(faker.datatype.number()),
      login: faker.internet.userName(),
      vendor: 'GITHUB',
    });

    const deleteResult = await deleteUserLogin(result.item);
    expect(deleteResult).toMatchInlineSnapshot(
      {
        capacity: {TableName: expect.any(String)},
      },
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

    await expect(async () => await readUserLogin(result.item)).rejects.toThrow(
      NotFoundError
    );
  });

  it('throws an error if the record does not exist', async () => {
    await expect(
      async () =>
        await deleteUserLogin({
          externalId: 'does-not-exist',
          login: 'does-not-exist',
          vendor: 'GITHUB',
        })
    ).rejects.toThrow(NotFoundError);
  });
});

describe('readUserLogin()', () => {
  it('reads a record', async () => {
    const result = await createUserLogin({
      externalId: String(faker.datatype.number()),
      login: faker.internet.userName(),
      vendor: 'GITHUB',
    });

    const readResult = await readUserLogin(result.item);
    expect(readResult).toMatchInlineSnapshot(
      userLoginMatcher,
      `
      {
        "capacity": {
          "CapacityUnits": 0.5,
          "GlobalSecondaryIndexes": undefined,
          "LocalSecondaryIndexes": undefined,
          "ReadCapacityUnits": undefined,
          "Table": {
            "CapacityUnits": 0.5,
            "ReadCapacityUnits": undefined,
            "WriteCapacityUnits": undefined,
          },
          "TableName": Any<String>,
          "WriteCapacityUnits": undefined,
        },
        "item": {
          "createdAt": Any<Date>,
          "externalId": "94988",
          "id": Any<String>,
          "login": "Craig59",
          "updatedAt": Any<Date>,
          "vendor": "GITHUB",
          "version": 1,
        },
        "metrics": undefined,
      }
    `
    );

    // cleanup, not part of test
    await deleteUserLogin(result.item);
  });

  it('throws an error if the record does not exist', async () => {
    await expect(
      async () =>
        await readUserLogin({
          externalId: 'does-not-exist',
          login: 'does-not-exist',
          vendor: 'GITHUB',
        })
    ).rejects.toThrow(NotFoundError);
  });
});

describe('touchUserLogin()', () => {
  it("updates a record's createdAt and extends its ttl (if present)", async () => {
    const result = await createUserLogin({
      externalId: String(faker.datatype.number()),
      login: faker.internet.userName(),
      vendor: 'GITHUB',
    });

    const readResult = await readUserLogin(result.item);
    expect(readResult).toMatchInlineSnapshot(
      userLoginMatcher,
      `
      {
        "capacity": {
          "CapacityUnits": 0.5,
          "GlobalSecondaryIndexes": undefined,
          "LocalSecondaryIndexes": undefined,
          "ReadCapacityUnits": undefined,
          "Table": {
            "CapacityUnits": 0.5,
            "ReadCapacityUnits": undefined,
            "WriteCapacityUnits": undefined,
          },
          "TableName": Any<String>,
          "WriteCapacityUnits": undefined,
        },
        "item": {
          "createdAt": Any<Date>,
          "externalId": "97362",
          "id": Any<String>,
          "login": "Moses.Parker",
          "updatedAt": Any<Date>,
          "vendor": "GITHUB",
          "version": 1,
        },
        "metrics": undefined,
      }
    `
    );

    await touchUserLogin(result.item);
    const touchResult = await readUserLogin(result.item);
    expect(touchResult).toMatchInlineSnapshot(
      userLoginMatcher,
      `
      {
        "capacity": {
          "CapacityUnits": 0.5,
          "GlobalSecondaryIndexes": undefined,
          "LocalSecondaryIndexes": undefined,
          "ReadCapacityUnits": undefined,
          "Table": {
            "CapacityUnits": 0.5,
            "ReadCapacityUnits": undefined,
            "WriteCapacityUnits": undefined,
          },
          "TableName": Any<String>,
          "WriteCapacityUnits": undefined,
        },
        "item": {
          "createdAt": Any<Date>,
          "externalId": "97362",
          "id": Any<String>,
          "login": "Moses.Parker",
          "updatedAt": Any<Date>,
          "vendor": "GITHUB",
          "version": 2,
        },
        "metrics": undefined,
      }
    `
    );

    expect(readResult.item.createdAt).toEqual(touchResult.item.createdAt);
    expect(readResult.item.updatedAt).toEqual(touchResult.item.updatedAt);

    // cleanup, not part of test
    await deleteUserLogin(result.item);
  });

  it('throws an error if the record does not exist', async () => {
    await expect(
      async () =>
        await touchUserLogin({
          externalId: 'does-not-exist',
          login: 'does-not-exist',
          vendor: 'GITHUB',
        })
    ).rejects.toThrow(NotFoundError);
  });
});

describe('updateUserLogin()', () => {
  it('updates a record', async () => {
    const createResult = await createUserLogin({
      externalId: String(faker.datatype.number()),
      login: faker.internet.userName(),
      vendor: 'GITHUB',
    });
    expect(createResult).toMatchInlineSnapshot(
      userLoginMatcher,
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
          "externalId": "82326",
          "id": Any<String>,
          "login": "Cecile55",
          "updatedAt": Any<Date>,
          "vendor": "GITHUB",
          "version": 1,
        },
        "metrics": undefined,
      }
    `
    );

    const updateResult = await updateUserLogin({
      ...createResult.item,
    });
    expect(updateResult).toMatchInlineSnapshot(
      userLoginMatcher,
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
          "externalId": "82326",
          "id": Any<String>,
          "login": "Cecile55",
          "updatedAt": Any<Date>,
          "vendor": "GITHUB",
          "version": 2,
        },
        "metrics": undefined,
      }
    `
    );

    const readResult = await readUserLogin(createResult.item);
    expect(readResult).toMatchInlineSnapshot(
      userLoginMatcher,
      `
      {
        "capacity": {
          "CapacityUnits": 0.5,
          "GlobalSecondaryIndexes": undefined,
          "LocalSecondaryIndexes": undefined,
          "ReadCapacityUnits": undefined,
          "Table": {
            "CapacityUnits": 0.5,
            "ReadCapacityUnits": undefined,
            "WriteCapacityUnits": undefined,
          },
          "TableName": Any<String>,
          "WriteCapacityUnits": undefined,
        },
        "item": {
          "createdAt": Any<Date>,
          "externalId": "82326",
          "id": Any<String>,
          "login": "Cecile55",
          "updatedAt": Any<Date>,
          "vendor": "GITHUB",
          "version": 2,
        },
        "metrics": undefined,
      }
    `
    );

    expect(readResult.item.createdAt).toEqual(updateResult.item.createdAt);
    expect(readResult.item.updatedAt).toEqual(updateResult.item.updatedAt);

    // cleanup, not part of test
    await deleteUserLogin(createResult.item);
  });

  it('throws an error if the record does not exist', async () => {
    await expect(
      async () =>
        await updateUserLogin({
          externalId: 'does-not-exist',
          id: 'does-not-exist',
          login: 'does-not-exist',
          vendor: 'GITHUB',
          version: 0,
        })
    ).rejects.toThrow(NotFoundError);
  });

  it('throws an error if the loaded record is out of date', async () => {
    const createResult = await createUserLogin({
      externalId: String(faker.datatype.number()),
      login: faker.internet.userName(),
      vendor: 'GITHUB',
    });
    await updateUserLogin({
      ...createResult.item,
    });

    await expect(
      async () =>
        await updateUserLogin({
          ...createResult.item,
        })
    ).rejects.toThrow(OptimisticLockingError);

    // cleanup, not part of test
    await deleteUserLogin(createResult.item);
  });
});

describe('queryUserLogin()', () => {
  async function prepare() {
    const externalId1 = String(faker.datatype.number());
    const login1a = faker.internet.userName();

    await createUserLogin({
      externalId: externalId1,
      login: login1a,
      vendor: 'GITHUB',
    });

    const externalId2 = String(faker.datatype.number());
    const login2a = faker.internet.userName();
    const login2b = faker.internet.userName();
    const login2c = faker.internet.userName();

    await createUserLogin({
      externalId: externalId2,
      login: login2a,
      vendor: 'GITHUB',
    });

    await createUserLogin({
      externalId: externalId2,
      login: login2b,
      vendor: 'GITHUB',
    });

    await createUserLogin({
      externalId: externalId2,
      login: login2c,
      vendor: 'GITHUB',
    });

    return {
      externalId1,
      externalId2,
      login1a,
      login2a,
      login2b,
      login2c,
    };
  }

  it('finds all records by a partial primary key', async () => {
    const {externalId1} = await prepare();

    const queryResult = await queryUserLogin({
      externalId: externalId1,
      vendor: 'GITHUB',
    });

    expect(queryResult).toMatchInlineSnapshot();
    expect(queryResult.items).toHaveLength(3);
  });

  it('finds a record by a full index key', async () => {
    const {externalId1, login1a} = await prepare();

    const queryResult = await queryUserLogin({
      externalId: externalId1,
      login: login1a,
      vendor: 'GITHUB',
    });

    expect(queryResult).toMatchInlineSnapshot();
    expect(queryResult.items).toHaveLength(1);
  });

  it('finds a record by a partial index key', async () => {
    const {login2a} = await prepare();

    const queryResult = await queryUserLogin({
      login: login2a,
      vendor: 'GITHUB',
    });

    expect(queryResult).toMatchInlineSnapshot();
    expect(queryResult.items).toHaveLength(1);
  });
});
