import {faker} from '@faker-js/faker';

import {NotFoundError} from '../../src/runtime';
import {waitFor} from '../test-helpers';

import {
  createSubscription,
  deleteAccount,
  deleteSubscription,
  readAccount,
} from './__generated__/actions';

faker.seed(1701);

describe('Change Date Capture', () => {
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
      expect(account.cancelled).toBe(false);

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
      expect(account.cancelled).toBe(false);

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
      expect(account.cancelled).toBe(false);

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
