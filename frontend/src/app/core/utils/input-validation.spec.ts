import { describe, expect, it } from 'vitest';
import {
  validateDisplayName,
  normalizeText,
  validateEmail,
  validateImageUploadFile,
  validateIntegerRange,
  validateInviteCode,
  validateOptionalPlayerName,
  validateOptionalText,
  validatePassword,
  validateRequiredText,
  sanitizeSearchInput,
  sanitizeSingleLineInput,
  validateSearchText,
} from './input-validation';

describe('input-validation utils', () => {
  it('normalizes text values', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
    expect(normalizeText(undefined)).toBe('');
  });

  it('validates required text constraints', () => {
    expect(validateRequiredText('', 'Name')).toBe('Name is required');
    expect(validateRequiredText('ab', 'Name', { minLength: 3 })).toBe(
      'Name must be at least 3 characters',
    );
    expect(validateRequiredText('abcdef', 'Name', { maxLength: 5 })).toBe(
      'Name must be at most 5 characters',
    );
    expect(validateRequiredText('valid', 'Name', { minLength: 2, maxLength: 10 })).toBeNull();
  });

  it('validates optional text constraints', () => {
    expect(validateOptionalText('', 'Description', { maxLength: 10 })).toBeNull();
    expect(validateOptionalText('12345678901', 'Description', { maxLength: 10 })).toBe(
      'Description must be at most 10 characters',
    );
  });

  it('validates email and invite code', () => {
    expect(validateEmail('')).toBe('Please enter an email address');
    expect(validateEmail('invalid@')).toBe('Please enter a valid email address');
    expect(validateEmail('valid@example.com')).toBeNull();

    expect(validateInviteCode('')).toBe('Please enter an invite code');
    expect(validateInviteCode('abc def')).toBe('Invite code must not contain spaces');
    expect(validateInviteCode('abc123')).toBeNull();
  });

  it('validates display names, passwords, and search text', () => {
    expect(validateDisplayName('')).toBe('Display name is required');
    expect(validateDisplayName('ab')).toBeNull();
    expect(validateDisplayName('bad@name')).toBe('Display name contains unsupported characters');

    expect(validatePassword('short')).toBe('Password must be at least 8 characters');
    expect(validatePassword('validpassword')).toBeNull();

    expect(validateSearchText('')).toBe('Search term is required');
    expect(validateSearchText('ok name')).toBeNull();
    expect(validateSearchText('bad@query')).toBe('Search term contains unsupported characters');
  });

  it('validates image file constraints', () => {
    expect(validateImageUploadFile(null)).toBe('Please select an image first.');
    const invalidType = new File(['x'], 'invalid.gif', { type: 'image/gif' });
    expect(validateImageUploadFile(invalidType)).toBe(
      'Unsupported image type. Allowed: JPEG, PNG, WebP.',
    );
    const valid = new File(['x'], 'valid.png', { type: 'image/png' });
    expect(validateImageUploadFile(valid, { maxBytes: 1024 })).toBeNull();
  });

  it('validates integer ranges', () => {
    expect(validateIntegerRange(1.5, 'Value', 0, 10)).toBe('Value must be a whole number');
    expect(validateIntegerRange(11, 'Value', 0, 10)).toBe('Value must be between 0 and 10');
    expect(validateIntegerRange(4, 'Value', 0, 10)).toBeNull();
  });

  it('sanitizes single-line and search inputs', () => {
    expect(sanitizeSingleLineInput('abc\u0000def', 10)).toBe('abcdef');
    expect(sanitizeSingleLineInput('123456', 4)).toBe('1234');
    expect(sanitizeSearchInput("  Hello   O'Neill  ")).toBe("Hello O'Neill");
  });

  it('validates optional player names', () => {
    expect(validateOptionalPlayerName('')).toBeNull();
    expect(validateOptionalPlayerName('Alice')).toBeNull();
    expect(validateOptionalPlayerName('bad@name')).toBe(
      'Player names contain unsupported characters',
    );
  });
});

