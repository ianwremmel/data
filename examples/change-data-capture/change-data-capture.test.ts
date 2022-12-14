import {faker} from '@faker-js/faker';
import {NotFoundError} from '@ianwremmel/data';

import {waitFor} from '../test-helpers';

import {
  createAccount,
  createSubscription,
  deleteAccount,
  deleteSubscription,
  queryAccount,
  readAccount,
} from './__generated__/actions';

describe('Change Date Capture', () => {
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

describe('@secondaryIndex', () => {
  it('allows loading a record by an lsi', async () => {
    const result = await createAccount({
      cancelled: false,
      effectiveDate: faker.date.past(3),
      externalId: String(faker.datatype.number()),
      onFreeTrial: true,
      planName: 'ENTERPRISE',
      vendor: 'GITHUB',
    });

    const {item: account} = result;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const {items: accounts} = await queryAccount({
      externalId: account.externalId,
      index: 'lsi1',
      vendor: account.vendor,
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toStrictEqual(account);

    await deleteAccount(account);
  });
});
