/**
 * Input validation and sanitization utilities
 * Prevents XSS and ensures data integrity
 */

export type ValidationResult = {
  valid: boolean;
  value?: string;
  error?: string;
};

/**
 * Sanitizes user input by removing potentially dangerous characters
 * and enforcing max length
 */
export const sanitizeInput = (input: string, maxLength = 500): string => {
  if (typeof input !== 'string') {
    return '';
  }

  return input.slice(0, maxLength).replace(/[<>]/g, '');
};

/**
 * Validates a node/group label
 */
export const validateLabel = (label: string): ValidationResult => {
  const sanitized = sanitizeInput(label, 100);
  const normalized = sanitized.trim();

  if (normalized.length === 0) {
    return {
      valid: false,
      error: 'Label cannot be empty',
    };
  }

  return {
    valid: true,
    value: normalized,
  };
};

/**
 * Validates a connection relation field
 */
export const validateRelation = (relation: string): ValidationResult => {
  const sanitized = sanitizeInput(relation, 50);
  const normalized = sanitized.trim();

  if (normalized.length > 50) {
    return {
      valid: false,
      error: 'Relation is too long (max 50 characters)',
    };
  }

  return {
    valid: true,
    value: normalized,
  };
};

/**
 * Validates a profile field value
 */
export const validateProfileField = (value: string): ValidationResult => {
  const sanitized = sanitizeInput(value, 500);

  if (sanitized.length > 500) {
    return {
      valid: false,
      error: 'Value is too long (max 500 characters)',
    };
  }

  return {
    valid: true,
    value: sanitized,
  };
};

/**
 * Validates a group title
 */
export const validateGroupTitle = (title: string): ValidationResult => {
  const sanitized = sanitizeInput(title, 100);
  const normalized = sanitized.trim();

  if (normalized.length === 0) {
    return {
      valid: false,
      error: 'Title cannot be empty',
    };
  }

  return {
    valid: true,
    value: normalized,
  };
};
