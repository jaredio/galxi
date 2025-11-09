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

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential XSS chars
};

/**
 * Validates a node/group label
 */
export const validateLabel = (label: string): ValidationResult => {
  const sanitized = sanitizeInput(label, 100);

  if (sanitized.length === 0) {
    return {
      valid: false,
      error: 'Label cannot be empty',
    };
  }

  if (sanitized.length > 100) {
    return {
      valid: false,
      error: 'Label is too long (max 100 characters)',
    };
  }

  return {
    valid: true,
    value: sanitized,
  };
};

/**
 * Validates a connection relation field
 */
export const validateRelation = (relation: string): ValidationResult => {
  const sanitized = sanitizeInput(relation, 50);

  if (sanitized.length > 50) {
    return {
      valid: false,
      error: 'Relation is too long (max 50 characters)',
    };
  }

  return {
    valid: true,
    value: sanitized,
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

  if (sanitized.length === 0) {
    return {
      valid: false,
      error: 'Title cannot be empty',
    };
  }

  if (sanitized.length > 100) {
    return {
      valid: false,
      error: 'Title is too long (max 100 characters)',
    };
  }

  return {
    valid: true,
    value: sanitized,
  };
};
