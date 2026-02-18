import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  areNextSeasonFieldsTouched,
  isSameNullableUtcDate,
  normalizeSeasonName,
  parseUtcDate,
  toUtcDateLabel,
  validateSeasonWindow,
} from './groups-crud-season.util';

describe('groups-crud-season.util', () => {
  it('detects next-season field updates', () => {
    expect(areNextSeasonFieldsTouched({} as any)).toBe(false);
    expect(areNextSeasonFieldsTouched({ nextSeasonName: 'Season 2' } as any)).toBe(true);
  });

  it('normalizes season names', () => {
    expect(normalizeSeasonName('  Season A  ')).toBe('Season A');
    expect(normalizeSeasonName('   ')).toBeNull();
    expect(normalizeSeasonName(null)).toBeNull();
  });

  it('parses utc dates and rejects invalid date input', () => {
    expect(parseUtcDate('2026-02-18T11:22:00.000Z')?.toISOString()).toBe(
      '2026-02-18T00:00:00.000Z',
    );
    expect(() => parseUtcDate('not-a-date')).toThrow(BadRequestException);
  });

  it('validates season windows and date label formatting', () => {
    expect(() =>
      validateSeasonWindow(
        new Date('2026-02-18T00:00:00.000Z'),
        new Date('2026-02-19T00:00:00.000Z'),
        'Season',
      ),
    ).not.toThrow();
    expect(() =>
      validateSeasonWindow(
        new Date('2026-02-19T00:00:00.000Z'),
        new Date('2026-02-18T00:00:00.000Z'),
        'Season',
      ),
    ).toThrow(BadRequestException);
    expect(toUtcDateLabel(new Date('2026-02-18T12:34:56.000Z'))).toBe('2026-02-18');
  });

  it('compares nullable utc dates', () => {
    expect(isSameNullableUtcDate(null, null)).toBe(true);
    expect(isSameNullableUtcDate(new Date('2026-02-18T01:00:00.000Z'), null)).toBe(false);
    expect(
      isSameNullableUtcDate(
        new Date('2026-02-18T01:00:00.000Z'),
        new Date('2026-02-18T23:00:00.000Z'),
      ),
    ).toBe(true);
  });
});

