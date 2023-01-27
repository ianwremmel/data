import assert from 'assert';

import {UpdateCommand} from '@aws-sdk/lib-dynamodb';
import {faker} from '@faker-js/faker';
import {NotFoundError} from '@ianwremmel/data';

import {ddbDocClient} from '../dependencies';
import {waitFor} from '../test-helpers';

import {
  createSubscription,
  deleteAccount,
  deleteSubscription,
  marshallAccount,
  readAccount,
  updateAccount,
} from './__generated__/actions';

describe('Single Table Design', () => {
  // some part of the eventbridge setup doesn't work in localstack. This means
  // there's no test for this in CI right now, but it works when tested locally
  // against a real AWS account, which I don't want to wire into CI right now.
  it(
    'applies a custom mapper to update one model based on another',
    async () => {
      const externalId = String(faker.datatype.number());
      const vendor = 'GITHUB';

      // Confirm there is no record yet.
      await expect(
        async () => await readAccount({externalId, vendor})
      ).rejects.toThrow(NotFoundError);

      const {item: subscription1} = await createSubscription({
        effectiveDate: faker.date.past(3),
        externalId,
        onFreeTrial: true,
        planName: 'ENTERPRISE',
        vendor,
      });

      let account = await waitFor(async () => {
        const {item} = await readAccount({externalId, vendor});
        expect(item).toBeDefined();
        expect(item.version).toBe(1);
        return item;
      });
      expect(account.planName).toBe('ENTERPRISE');
      expect(account.onFreeTrial).toBe(true);
      expect(account.cancelled).not.toBe(true);

      const {item: subscription2} = await createSubscription({
        effectiveDate: faker.date.future(0, account.effectiveDate),
        externalId,
        onFreeTrial: false,
        planName: 'ENTERPRISE',
        vendor,
      });

      account = await waitFor(async () => {
        const {item} = await readAccount({externalId, vendor});
        expect(item).toBeDefined();
        expect(item.version).toBe(2);
        return item;
      });
      expect(account.planName).toBe('ENTERPRISE');
      expect(account.onFreeTrial).toBe(false);
      expect(account.cancelled).not.toBe(true);

      const {item: subscription3} = await createSubscription({
        effectiveDate: faker.date.future(0, account.effectiveDate),
        externalId,
        onFreeTrial: false,
        planName: 'SMALL_TEAM',
        vendor,
      });

      account = await waitFor(async () => {
        const {item} = await readAccount({externalId, vendor});
        expect(item).toBeDefined();
        expect(item.version).toBe(3);
        return item;
      });
      expect(account.planName).toBe('SMALL_TEAM');
      expect(account.onFreeTrial).toBe(false);
      expect(account.cancelled).not.toBe(true);

      const {item: subscription4} = await createSubscription({
        cancelled: true,
        effectiveDate: faker.date.future(0, account.effectiveDate),
        externalId,
        onFreeTrial: false,
        planName: null,
        vendor,
      });

      account = await waitFor(async () => {
        const {item} = await readAccount({externalId, vendor});
        expect(item).toBeDefined();
        expect(item.version).toBe(4);
        return item;
      });
      expect(account.planName).toBe(null);
      expect(account.onFreeTrial).toBe(false);
      expect(account.cancelled).toBe(true);

      // cleanup
      await deleteAccount(account);
      await deleteSubscription(subscription1);
      await deleteSubscription(subscription2);
      await deleteSubscription(subscription3);
      await deleteSubscription(subscription4);
    },
    5 * 60 * 1000
  );
});

describe('#version', () => {
  it("does not blow up when the version is not set, for example, when adopting a previous library's data", async () => {
    const tableName = process.env.TABLE_ACCOUNTS;
    assert(tableName, 'TABLE_ACCOUNTS is not set');

    const externalId = String(faker.datatype.number());
    const vendor = 'GITHUB';

    try {
      const now = new Date();

      const {
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        UpdateExpression,
      } = marshallAccount(
        {
          effectiveDate: new Date(),
          externalId,
          vendor,
        },
        now
      );
      delete ExpressionAttributeNames['#version'];
      delete ExpressionAttributeValues[':version'];

      const result = await ddbDocClient.send(
        new UpdateCommand({
          ConditionExpression: 'attribute_not_exists(#pk)',
          ExpressionAttributeNames: {
            ...ExpressionAttributeNames,
            '#createdAt': '_ct',
          },
          ExpressionAttributeValues: {
            ...ExpressionAttributeValues,
            ':createdAt': now.getTime(),
          },
          Key: {pk: `ACCOUNT#${vendor}#${externalId}`, sk: `SUMMARY`},
          ReturnConsumedCapacity: 'INDEXES',
          ReturnItemCollectionMetrics: 'SIZE',
          ReturnValues: 'ALL_NEW',
          TableName: tableName,
          UpdateExpression: `${UpdateExpression.split(',')
            .filter((item) => !item.includes('version'))
            .join(',')}, #createdAt = :createdAt`,
        })
      );

      const promise = readAccount({
        externalId,
        vendor,
      });

      await expect(promise).resolves.not.toThrow();
      const {item: existing} = await promise;
      expect(existing.version).toMatchInlineSnapshot(`undefined`);

      const updatePromise = updateAccount({
        ...existing,
        cancelled: true,
      });
      await updatePromise;
      await expect(updatePromise).resolves.not.toThrow();
      const {item: updated} = await updatePromise;
      expect(updated.version).toMatchInlineSnapshot(`1`);
    } finally {
      await deleteAccount({externalId, vendor});
    }
  }, 10000);
});
