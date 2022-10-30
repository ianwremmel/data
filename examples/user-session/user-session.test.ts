import {
  createUserSession,
  deleteUserSession,
  readUserSession,
  touchUserSession,
  updateUserSession,
} from './__generated__/actions';

describe('createUserSession()', () => {
  it('creates a user session', async () => {
    const result = await createUserSession({session: {foo: 'foo'}});
    expect(result).toMatchInlineSnapshot(`undefined`);
  });
});

describe('deleteUserSession()', () => {
  it('deletes a user session', async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    deleteUserSession({id: result.id});
    await expect(
      async () => await readUserSession({id: result.id})
    ).rejects.toThrow();
  });

  it('throws an error if the user session does not exist', async () => {
    await expect(
      async () => await deleteUserSession({id: 'some-id'})
    ).rejects.toThrow();
  });
});

describe('readUserSession()', () => {
  it('reads a user session', async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    const readResult = await readUserSession({id: result.id});
    expect(readResult).toMatchInlineSnapshot();
  });

  it('throws an error if the user session does not exist', async () => {
    await expect(
      async () => await readUserSession({id: 'some-id'})
    ).rejects.toThrow();
  });
});

describe('touchUserSession()', () => {
  it("updates a user session's createdAt and extends its ttl", async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    const readResult = await readUserSession({id: result.id});
    expect(readResult).toMatchInlineSnapshot();

    await touchUserSession({id: result.id});
    const touchResult = await readUserSession({id: result.id});
    expect(touchResult).toMatchInlineSnapshot();

    expect(readResult.createdAt).not.toEqual(touchResult.createdAt);

    expect(readResult.expires).not.toEqual(touchResult.expires);
  });

  it('throws an error if the user session does not exist', async () => {
    await expect(
      async () => await touchUserSession({id: 'some-id'})
    ).rejects.toThrow();
  });
});

describe('updateUserSession()', () => {
  it('updates a user session', async () => {
    const result = await createUserSession({session: {foo: 'foo'}});

    const readResult = await readUserSession({id: result.id});
    expect(readResult).toMatchInlineSnapshot();

    await updateUserSession({
      id: result.id,
      session: {foo: 'bar'},
    });
    const updateResult = await readUserSession({id: result.id});
    expect(updateResult).toMatchInlineSnapshot();
    expect(updateResult.session).toEqual({foo: 'bar'});
  });

  it('throws an error if the user session does not exist', async () => {
    await expect(
      async () =>
        await updateUserSession({id: 'some-id', session: {foo: 'foo'}})
    ).rejects.toThrow();
  });
});
