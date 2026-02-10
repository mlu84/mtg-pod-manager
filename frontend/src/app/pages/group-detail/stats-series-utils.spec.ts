import { describe, expect, it } from 'vitest';
import { Deck } from '../../models/group.model';
import { Game } from '../../models/game.model';
import { getDeckRankSeries, getDeckSeries } from './stats-series-utils';

const decks: Deck[] = [
  {
    id: 'd1',
    name: 'Deck One',
    colors: 'W',
    isActive: true,
    performanceRating: 0,
    gamesPlayed: 0,
    owner: { id: 'u1', inAppName: 'Alice' },
  },
  {
    id: 'd2',
    name: 'Deck Two',
    colors: 'U',
    isActive: true,
    performanceRating: 0,
    gamesPlayed: 0,
    owner: { id: 'u2', inAppName: 'Bob' },
  },
];

const games: Game[] = [
  {
    id: 'g1',
    playedAt: '2026-01-01T10:00:00.000Z',
    playerCount: 2,
    placements: [
      { rank: 1, points: 100, deck: { id: 'd1', name: 'Deck One', colors: 'W' } },
      { rank: 2, points: 0, deck: { id: 'd2', name: 'Deck Two', colors: 'U' } },
    ],
  },
  {
    id: 'g2',
    playedAt: '2026-01-02T10:00:00.000Z',
    playerCount: 2,
    placements: [
      { rank: 1, points: 100, deck: { id: 'd2', name: 'Deck Two', colors: 'U' } },
      { rank: 2, points: 0, deck: { id: 'd1', name: 'Deck One', colors: 'W' } },
    ],
  },
];

describe('stats-series-utils', () => {
  it('builds a limited deck series in chronological order', () => {
    const series = getDeckSeries(games, 'd1', 1);
    expect(series).toHaveLength(1);
    expect(series[0].game.id).toBe('g2');
    expect(series[0].placement.points).toBe(0);
  });

  it('builds deck rank series based on running performance and tie breakers', () => {
    const rankSeries = getDeckRankSeries(games, decks, 'd1', 10);
    expect(rankSeries.map((x) => x.game.id)).toEqual(['g1', 'g2']);
    expect(rankSeries.map((x) => x.rank)).toEqual([1, 1]);
  });
});
