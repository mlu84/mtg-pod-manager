import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { resolveSeasonUpdateState } from './groups-crud-season-update.util';

const baseGroupState = {
  activeSeasonName: 'Season A',
  activeSeasonEndsAt: new Date('2026-03-01T00:00:00.000Z'),
  activeSeasonStartedAt: new Date('2026-02-01T00:00:00.000Z'),
  nextSeasonName: null,
  nextSeasonStartsAt: null,
  nextSeasonEndsAt: null,
  nextSeasonIsSuccessive: false,
  nextSeasonInterval: null,
  nextSeasonIntermissionDays: 0,
  seasonPauseDays: 0,
  seasonPauseUntil: null,
} as const;

describe('resolveSeasonUpdateState', () => {
  it('resolves defaults when next season is untouched', () => {
    const result = resolveSeasonUpdateState(
      { ...baseGroupState },
      {},
      new Date('2026-02-10T00:00:00.000Z'),
    );

    expect(result.nextFieldsTouched).toBe(false);
    expect(result.effectiveSeasonStart?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(result.effectiveSeasonEnd?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('rejects active season start modifications', () => {
    expect(() =>
      resolveSeasonUpdateState(
        { ...baseGroupState },
        { activeSeasonStartedAt: '2026-02-02T00:00:00.000Z' },
      ),
    ).toThrow(BadRequestException);
  });

  it('requires next season start when next-season data is touched', () => {
    expect(() =>
      resolveSeasonUpdateState(
        { ...baseGroupState },
        { nextSeasonName: 'Season B' },
      ),
    ).toThrow('Next season start date is required');
  });
});

