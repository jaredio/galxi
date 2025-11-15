import { validateProfileField } from './validation';

const PROFILE_FIELD_MAX_LENGTH = 500;

/**
 * Normalizes user-supplied profile field values.
 * Returns `null` when the update should be ignored (e.g., exceeds max length).
 */
export const sanitizeProfileFieldValue = (value: string): string | null => {
  if (value.length > PROFILE_FIELD_MAX_LENGTH) {
    return null;
  }
  const result = validateProfileField(value);
  if (!result.valid || typeof result.value === 'undefined') {
    return null;
  }
  return result.value;
};
