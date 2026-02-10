import { describe, expect, it } from 'vitest';
import { isValidRankConfiguration } from './rank-utils';

describe('isValidRankConfiguration', () => {
  it('accepts simple sequential ranks', () => {
    expect(isValidRankConfiguration([1, 2, 3, 4])).toBe(true);
  });

  it('accepts ties without gaps', () => {
    expect(isValidRankConfiguration([1, 1, 3, 4])).toBe(true);
    expect(isValidRankConfiguration([1, 2, 2, 4])).toBe(true);
  });

  it('accepts gaps when ranks stay within player count', () => {
    expect(isValidRankConfiguration([1, 3, 3])).toBe(true);
    expect(isValidRankConfiguration([1, 3, 3, 3])).toBe(true);
  });

  it('rejects gaps that exceed player count', () => {
    expect(isValidRankConfiguration([1, 3, 4])).toBe(false);
    expect(isValidRankConfiguration([1, 1, 4])).toBe(false);
  });

  it('rejects ranks above player count', () => {
    expect(isValidRankConfiguration([1, 2, 5])).toBe(false);
  });

  it('rejects non-integer ranks', () => {
    expect(isValidRankConfiguration([1, 2.5, 3])).toBe(false);
  });
});
