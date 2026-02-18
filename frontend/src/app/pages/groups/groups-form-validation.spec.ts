import { describe, expect, it } from 'vitest';
import { validateCreateGroupFormInput, validateGroupSearchInput } from './groups-form-validation';

describe('groups-form-validation', () => {
  it('validates and normalizes create-group input', () => {
    const result = validateCreateGroupFormInput('  Alpha  ', ' Commander ', '  Test ');
    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({
      name: 'Alpha',
      format: 'Commander',
      description: 'Test',
    });
  });

  it('rejects invalid create-group input', () => {
    expect(validateCreateGroupFormInput('', 'Commander', '').error).toBe('Name and format are required');
    expect(validateCreateGroupFormInput('Alpha', '', '').error).toBe('Name and format are required');
    expect(validateCreateGroupFormInput('A', 'Commander', 'x'.repeat(501)).error)
      .toBe('Description must be at most 500 characters');
  });

  it('validates group search input', () => {
    expect(validateGroupSearchInput('  commander  ').value).toBe('commander');
    expect(validateGroupSearchInput('').error).toBe('Please enter a search term');
    expect(validateGroupSearchInput('x'.repeat(101)).error)
      .toBe('Search term must be at most 100 characters');
  });
});
