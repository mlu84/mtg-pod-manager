import { describe, expect, it } from 'vitest';
import { resolveApiErrorMessage } from './group-detail-error.util';

describe('group-detail-error.util', () => {
  it('returns unauthorized message for 401', () => {
    const message = resolveApiErrorMessage({ status: 401 }, 'Fallback');
    expect(message).toBe('Session expired or unauthorized. Please log in again.');
  });

  it('returns api message when provided', () => {
    const message = resolveApiErrorMessage(
      { error: { message: 'Backend specific error' } },
      'Fallback',
    );
    expect(message).toBe('Backend specific error');
  });

  it('falls back to default message', () => {
    const message = resolveApiErrorMessage({}, 'Fallback');
    expect(message).toBe('Fallback');
  });
});
