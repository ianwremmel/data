import type {Account, UserSession} from './__generated__/actions';

/**
 * Simulates computing a field's value.
 * @param model - The entire model
 */
export function computeField(model: UserSession) {
  return 'a computed value';
}

/**
 * Computes the indexable plan name from either the current plan name or the
 * last plan name if the account is cancelled
 */
export function computeIndexedPlanName({
  cancelled,
  lastPlanName,
  planName,
}: Account) {
  return cancelled ? lastPlanName : planName;
}
