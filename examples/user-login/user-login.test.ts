import {faker} from '@faker-js/faker';
import {NotFoundError, OptimisticLockingError} from '@ianwremmel/data';
import Base64 from 'base64url';

import {
  createUserLogin,
  deleteUserLogin,
  queryUserLogin,
  queryUserLoginByNodeId,
  readUserLogin,
  updateUserLogin,
} from './__generated__/actions';

const userLoginMatcher = {
  createdAt: expect.any(Date),
  id: expect.any(String),
  updatedAt: expect.any(Date),
};

const itemMatcher = {
  capacity: {TableName: expect.any(String)},
  item: userLoginMatcher,
};

describe('createUserLogin()', () => {
  it('creates a record', async () => {
    const result = await createUserLogin({
      externalId: String(faker.datatype.number()),
      login: faker.internet.userName(),
      vendor: 'GITHUB',
    });

    expect(result).toMatchInlineSnapshot(
      itemMatcher,
      `
      {
        "capacity": {
          "CapacityUnits": 2,
          "GlobalSecondaryIndexes": {
            "gsi1": {
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
      `"VXNlckxvZ2luOlVTRVIjR0lUSFVCIzg5NDMjOiNMT0dJTiNKb3NodWFoX0J1Y2tyaWRnZTUz"`
    );
    expect(Base64.decode(result.item.id)).toMatchInlineSnapshot(
      `"UserLogin:USER#GITHUB#8943#:#LOGIN#Joshuah_Buckridge53"`
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
          "CapacityUnits": 2,
          "GlobalSecondaryIndexes": {
            "gsi1": {
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
      itemMatcher,
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

describe('updateUserLogin()', () => {
  it('updates a record', async () => {
    const createResult = await createUserLogin({
      externalId: String(faker.datatype.number()),
      login: faker.internet.userName(),
      vendor: 'GITHUB',
    });
    expect(createResult).toMatchInlineSnapshot(
      itemMatcher,
      `
      {
        "capacity": {
          "CapacityUnits": 2,
          "GlobalSecondaryIndexes": {
            "gsi1": {
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

    const updateResult = await updateUserLogin({
      ...createResult.item,
    });
    expect(updateResult).toMatchInlineSnapshot(
      itemMatcher,
      `
      {
        "capacity": {
          "CapacityUnits": 3,
          "GlobalSecondaryIndexes": {
            "gsi1": {
              "CapacityUnits": 2,
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
          "createdAt": Any<Date>,
          "externalId": "8943",
          "id": Any<String>,
          "login": "Joshuah_Buckridge53",
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
      itemMatcher,
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
          "externalId": "8943",
          "id": Any<String>,
          "login": "Joshuah_Buckridge53",
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

  async function cleanup({
    externalId1,
    externalId2,
    login1a,
    login2a,
    login2b,
    login2c,
  }: {
    readonly externalId1: string;
    readonly externalId2: string;
    readonly login1a: string;
    readonly login2a: string;
    readonly login2b: string;
    readonly login2c: string;
  }) {
    await deleteUserLogin({
      externalId: externalId1,
      login: login1a,
      vendor: 'GITHUB',
    });

    await deleteUserLogin({
      externalId: externalId2,
      login: login2a,
      vendor: 'GITHUB',
    });

    await deleteUserLogin({
      externalId: externalId2,
      login: login2b,
      vendor: 'GITHUB',
    });

    await deleteUserLogin({
      externalId: externalId2,
      login: login2c,
      vendor: 'GITHUB',
    });
  }

  it('finds all records by a partial primary key', async () => {
    const {externalId2, ...rest} = await prepare();

    const queryResult = await queryUserLogin({
      externalId: externalId2,
      vendor: 'GITHUB',
    });

    expect(queryResult).toMatchInlineSnapshot(
      {
        capacity: {TableName: expect.any(String)},
        items: [userLoginMatcher, userLoginMatcher, userLoginMatcher],
      },
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
        "hasNextPage": false,
        "items": [
          {
            "createdAt": Any<Date>,
            "externalId": "48061",
            "id": Any<String>,
            "login": "Laurianne_Wiza40",
            "updatedAt": Any<Date>,
            "vendor": "GITHUB",
            "version": 1,
          },
          {
            "createdAt": Any<Date>,
            "externalId": "48061",
            "id": Any<String>,
            "login": "Norval_Thompson",
            "updatedAt": Any<Date>,
            "vendor": "GITHUB",
            "version": 1,
          },
          {
            "createdAt": Any<Date>,
            "externalId": "48061",
            "id": Any<String>,
            "login": "Valentin8",
            "updatedAt": Any<Date>,
            "vendor": "GITHUB",
            "version": 1,
          },
        ],
        "nextToken": undefined,
      }
    `
    );
    expect(queryResult.items).toHaveLength(3);

    await cleanup({externalId2, ...rest});
  });

  it('finds a record by a full primary key', async () => {
    const {externalId1, login1a, ...rest} = await prepare();

    const queryResult = await queryUserLogin({
      externalId: externalId1,
      login: login1a,
      vendor: 'GITHUB',
    });

    expect(queryResult).toMatchInlineSnapshot(
      {
        capacity: {TableName: expect.any(String)},
        items: [userLoginMatcher],
      },
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
        "hasNextPage": false,
        "items": [
          {
            "createdAt": Any<Date>,
            "externalId": "8943",
            "id": Any<String>,
            "login": "Joshuah_Buckridge53",
            "updatedAt": Any<Date>,
            "vendor": "GITHUB",
            "version": 1,
          },
        ],
        "nextToken": undefined,
      }
    `
    );
    expect(queryResult.items).toHaveLength(1);

    await cleanup({externalId1, login1a, ...rest});
  });

  it('finds a record by a partial index key', async () => {
    const {login2a, ...rest} = await prepare();

    const queryResult = await queryUserLogin({
      index: 'gsi1',
      login: login2a,
      vendor: 'GITHUB',
    });

    expect(queryResult).toMatchInlineSnapshot(
      {
        capacity: {TableName: expect.any(String)},
        items: [userLoginMatcher],
      },
      `
      {
        "capacity": {
          "CapacityUnits": 0.5,
          "GlobalSecondaryIndexes": {
            "gsi1": {
              "CapacityUnits": 0.5,
              "ReadCapacityUnits": undefined,
              "WriteCapacityUnits": undefined,
            },
          },
          "LocalSecondaryIndexes": undefined,
          "ReadCapacityUnits": undefined,
          "Table": {
            "CapacityUnits": 0,
            "ReadCapacityUnits": undefined,
            "WriteCapacityUnits": undefined,
          },
          "TableName": Any<String>,
          "WriteCapacityUnits": undefined,
        },
        "hasNextPage": false,
        "items": [
          {
            "createdAt": Any<Date>,
            "externalId": "48061",
            "id": Any<String>,
            "login": "Norval_Thompson",
            "updatedAt": Any<Date>,
            "vendor": "GITHUB",
            "version": 1,
          },
        ],
        "nextToken": undefined,
      }
    `
    );
    expect(queryResult.items).toHaveLength(1);

    await cleanup({login2a, ...rest});
  });
});

describe('queryUserLoginByNodeId()', () => {
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

  async function cleanup({
    externalId1,
    externalId2,
    login1a,
    login2a,
    login2b,
    login2c,
  }: {
    readonly externalId1: string;
    readonly externalId2: string;
    readonly login1a: string;
    readonly login2a: string;
    readonly login2b: string;
    readonly login2c: string;
  }) {
    await deleteUserLogin({
      externalId: externalId1,
      login: login1a,
      vendor: 'GITHUB',
    });

    await deleteUserLogin({
      externalId: externalId2,
      login: login2a,
      vendor: 'GITHUB',
    });

    await deleteUserLogin({
      externalId: externalId2,
      login: login2b,
      vendor: 'GITHUB',
    });

    await deleteUserLogin({
      externalId: externalId2,
      login: login2c,
      vendor: 'GITHUB',
    });
  }

  it('finds a record by a full primary key', async () => {
    const {externalId1, login1a, ...rest} = await prepare();

    const {item} = await readUserLogin({
      externalId: externalId1,
      login: login1a,
      vendor: 'GITHUB',
    });

    const queryResult = await queryUserLoginByNodeId(item.id);

    expect(queryResult).toMatchInlineSnapshot(
      itemMatcher,
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
          "externalId": "8943",
          "id": Any<String>,
          "login": "Joshuah_Buckridge53",
          "updatedAt": Any<Date>,
          "vendor": "GITHUB",
          "version": 1,
        },
      }
    `
    );

    await cleanup({externalId1, login1a, ...rest});
  });
});
