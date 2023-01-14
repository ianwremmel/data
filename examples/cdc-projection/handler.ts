import type {Account, Subscription} from './__generated__/actions';
import {readAccount} from './__generated__/actions';

/** cdc function */
export async function load(subscription: Subscription) {
  return await readAccount({
    externalId: subscription.externalId,
    vendor: subscription.vendor,
  });
}

/** cdc function */
export async function create(subscription: Subscription) {
  return {
    cancelled: subscription.cancelled,
    effectiveDate: subscription.effectiveDate,
    externalId: subscription.externalId,
    onFreeTrial: subscription.onFreeTrial,
    planName: subscription.planName,
    vendor: subscription.vendor,
  };
}

/** cdc function */
export async function update(subscription: Subscription, account: Account) {
  if (subscription.effectiveDate > account.effectiveDate) {
    return {
      ...account,
      cancelled: subscription.cancelled,
      effectiveDate: subscription.effectiveDate,
      onFreeTrial: subscription.onFreeTrial,
      planName: subscription.planName,
    };
  }
}
