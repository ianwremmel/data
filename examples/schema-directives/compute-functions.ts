import type {UserSession} from './__generated__/actions';

/**
 * Simulates computing a field's value.
 * @param field - The assigned value of the field
 * @param model - The entire model
 */
export function computeField(
  field: string | undefined | null,
  model: UserSession
) {
  if (field) {
    return field;
  }

  return 'a computed value';
}
