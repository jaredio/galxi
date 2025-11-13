import { describe, expect, it } from 'vitest';

import { validateGroupTitle, validateLabel, validateProfileField, validateRelation } from './validation';

describe('validation helpers', () => {
  it('trims and validates labels', () => {
    expect(validateLabel('  Hello  ').value).toBe('Hello');
    const invalid = validateLabel('   ');
    expect(invalid.valid).toBe(false);
  });

  it('enforces relation length caps by truncating input', () => {
    expect(validateRelation('link').value).toBe('link');
    const longRelation = 'x'.repeat(120);
    const result = validateRelation(longRelation);
    expect(result.valid).toBe(true);
    expect(result.value?.length).toBeLessThanOrEqual(50);
  });

  it('sanitizes profile fields', () => {
    const sanitized = validateProfileField('<script>alert(1)</script>');
    expect(sanitized.value).toBe('scriptalert(1)/script');
  });

  it('validates group titles', () => {
    expect(validateGroupTitle('My Group').value).toBe('My Group');
    expect(validateGroupTitle('   ').valid).toBe(false);
  });
});
