import { describe, expect, it } from 'vitest';
import { Game, GroupEvent } from '../../models/game.model';
import { buildHistoryItems, filterHistoryItems } from './history-utils';

const games: Game[] = [
  {
    id: 'g1',
    playedAt: '2026-01-10T10:00:00.000Z',
    playerCount: 2,
    placements: [],
  },
  {
    id: 'g2',
    playedAt: '2026-01-09T10:00:00.000Z',
    playerCount: 2,
    placements: [],
  },
];

const events: GroupEvent[] = [
  {
    id: 'e1',
    type: 'MEMBER_JOINED',
    message: 'Joined',
    createdAt: '2026-01-11T10:00:00.000Z',
  },
  {
    id: 'e2',
    type: 'GAME_RECORDED',
    message: 'Recorded',
    createdAt: '2026-01-11T09:00:00.000Z',
  },
];

describe('history-utils', () => {
  it('builds sorted history and excludes game mirror events', () => {
    const items = buildHistoryItems(games, events, 30, new Date('2026-01-12T00:00:00.000Z'));
    expect(items).toHaveLength(3);
    expect(items[0].type).toBe('event');
    expect(items[1].type).toBe('game');
    expect(items[2].type).toBe('game');
  });

  it('assigns descending game numbers based on recency', () => {
    const items = buildHistoryItems(games, [], 30, new Date('2026-01-12T00:00:00.000Z'));
    const gameItems = items.filter((x) => x.type === 'game');
    expect(gameItems.map((x) => x.gameNumber)).toEqual([2, 1]);
  });

  it('filters history items by type', () => {
    const items = buildHistoryItems(games, events, 30, new Date('2026-01-12T00:00:00.000Z'));
    expect(filterHistoryItems(items, 'all')).toHaveLength(3);
    expect(filterHistoryItems(items, 'games')).toHaveLength(2);
    expect(filterHistoryItems(items, 'events')).toHaveLength(1);
  });
});
