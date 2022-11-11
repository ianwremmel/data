import {
  createAccount,
  readAccount,
  Subscription,
  updateAccount,
} from './__generated__/actions';

/** cdc handler */
export async function handler(subscription: Subscription) {
  try {
    const {item: account} = await readAccount({
      externalId: subscription.externalId,
      vendor: subscription.vendor,
    });

    if (subscription.effectiveDate > account.effectiveDate) {
      await updateAccount({
        ...account,
        cancelled: subscription.cancelled,
        effectiveDate: subscription.effectiveDate,
        onFreeTrial: subscription.onFreeTrial,
        planName: subscription.planName,
      });
    }
  } catch (err) {
    await createAccount({
      cancelled: subscription.cancelled,
      effectiveDate: subscription.effectiveDate,
      externalId: subscription.externalId,
      onFreeTrial: subscription.onFreeTrial,
      planName: subscription.planName,
      vendor: subscription.vendor,
    });
  }
}
