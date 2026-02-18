import { describe, expect, it } from 'vitest';
import {
  addDaysToDateInput,
  getNextSeasonStartMinDate,
  hasActiveSeasonData,
  hasNextSeasonData,
  toUtcDateInputValue,
} from './group-detail-season-state.util';

describe('group-detail-season-state.util', () => {
  it('detects active season data', () => {
    expect(hasActiveSeasonData(null)).toBe(false);
    expect(hasActiveSeasonData({} as any)).toBe(false);
    expect(hasActiveSeasonData({ activeSeasonName: 'Season 1' } as any)).toBe(true);
  });

  it('detects next season data', () => {
    expect(hasNextSeasonData(null)).toBe(false);
    expect(hasNextSeasonData({} as any)).toBe(false);
    expect(hasNextSeasonData({ nextSeasonInterval: 'MONTHLY' } as any)).toBe(true);
    expect(hasNextSeasonData({ nextSeasonIntermissionDays: 3 } as any)).toBe(true);
  });

  it('normalizes to utc date input', () => {
    expect(toUtcDateInputValue(new Date('2026-03-15T12:45:00.000Z'))).toBe('2026-03-15');
  });

  it('adds days safely to date input', () => {
    expect(addDaysToDateInput('2026-03-15', 2)).toBe('2026-03-17');
    expect(addDaysToDateInput('invalid', 5)).toBe('invalid');
    expect(addDaysToDateInput('2026-03-15', -3)).toBe('2026-03-15');
  });

  it('computes next season minimum start date', () => {
    const minDate = getNextSeasonStartMinDate({
      editSeasonEndsAt: '2026-03-20',
      editSeasonPauseDays: 5,
      seasonPauseUntil: '2026-03-26T00:00:00.000Z',
      now: new Date('2026-03-15T08:00:00.000Z'),
    });

    expect(minDate).toBe('2026-03-26');
  });
});
