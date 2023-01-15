import type {
  Account,
  CreateAccountInput,
  Subscription,
  UpdateAccountInput,
} from './__generated__/actions';
import {readAccount} from './__generated__/actions';

/** cdc function */
export async function load(subscription: Subscription): Promise<Account> {
  const {item} = await readAccount({
    externalId: subscription.externalId,
    vendor: subscription.vendor,
  });
  return item;
}

/** cdc function */
export async function create(
  subscription: Subscription
): Promise<CreateAccountInput> {
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
export async function update(
  subscription: Subscription,
  account: Account
): Promise<UpdateAccountInput | undefined> {
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
