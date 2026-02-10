import { describe, expect, it } from 'vitest';
import { RankingEntry } from '../../models/game.model';
import {
  buildRankingWithTrends,
  hasRankingChanged,
  toPositionMap,
  toPositionRecord,
} from './ranking-trend-utils';

const ranking: RankingEntry[] = [
  {
    position: 1,
    id: 'a',
    name: 'Deck A',
    colors: 'W',
    owner: { id: 'u1', inAppName: 'Alice' },
    performanceRating: 80,
    gamesPlayed: 10,
    isActive: true,
  },
  {
    position: 2,
    id: 'b',
    name: 'Deck B',
    colors: 'U',
    owner: { id: 'u2', inAppName: 'Bob' },
    performanceRating: 70,
    gamesPlayed: 9,
    isActive: true,
  },
];

describe('ranking-trend-utils', () => {
  it('detects ranking changes', () => {
    const stored = new Map<string, number>([['a', 1], ['b', 2]]);
    expect(hasRankingChanged(ranking, stored)).toBe(false);
    expect(hasRankingChanged([{ ...ranking[0], position: 2 }, ranking[1]], stored)).toBe(true);
  });

  it('builds trends from baseline positions', () => {
    const baseline = new Map<string, number>([['a', 2], ['b', 1]]);
    const withTrends = buildRankingWithTrends(ranking, baseline, false);
    expect(withTrends[0].trend).toBe('up');
    expect(withTrends[1].trend).toBe('down');
  });

  it('converts between records and maps', () => {
    const record = toPositionRecord(ranking);
    expect(record).toEqual({ a: 1, b: 2 });
    const map = toPositionMap(record);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
  });
});
