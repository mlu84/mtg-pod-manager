import { describe, expect, it } from 'vitest';
import {
  addDaysUtc,
  addInterval,
  getSeasonLabel,
  isSameUtcDay,
  toUtcDay,
} from './groups-season.util';

describe('groups-season.util', () => {
  it('normalizes season label output', () => {
    expect(getSeasonLabel(null)).toBe('Season');
    expect(getSeasonLabel('Season Alpha')).toBe('Season Alpha');
    expect(getSeasonLabel('Alpha')).toBe('Season Alpha');
  });

  it('compares dates by UTC day', () => {
    const a = new Date('2026-02-18T00:10:00.000Z');
    const b = new Date('2026-02-18T23:50:00.000Z');
    const c = new Date('2026-02-19T00:00:00.000Z');
    expect(isSameUtcDay(a, b)).toBe(true);
    expect(isSameUtcDay(a, c)).toBe(false);
  });

  it('adds UTC days and intervals correctly', () => {
    const base = new Date('2026-01-31T12:00:00.000Z');
    expect(addDaysUtc(base, 2).toISOString()).toBe('2026-02-02T00:00:00.000Z');
    expect(addInterval(base, 'WEEKLY').toISOString()).toBe('2026-02-07T00:00:00.000Z');
    expect(addInterval(base, 'MONTHLY').toISOString()).toBe('2026-03-03T00:00:00.000Z');
  });

  it('normalizes to UTC day boundary', () => {
    expect(toUtcDay(new Date('2026-02-18T16:45:00.000Z')).toISOString()).toBe(
      '2026-02-18T00:00:00.000Z',
    );
  });
});
