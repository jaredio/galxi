import { validateProfileField } from './validation';

/**
 * Normalizes user-supplied profile field values.
 * Returns `null` when the update should be ignored (e.g., exceeds max length).
 */
export const sanitizeProfileFieldValue = (value: string): string | null => {
  const result = validateProfileField(value);
  if (!result.valid || typeof result.value === 'undefined') {
    return null;
  }
  return result.value;
};
