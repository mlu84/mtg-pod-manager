import { describe, expect, it } from 'vitest';
import { Deck } from '../../models/group.model';
import {
  filterDecks,
  filterStatsDecks,
  getDecksTotalPages,
  paginateDecks,
  sortDecksByName,
} from './deck-list-utils';

const decks: Deck[] = [
  {
    id: 'd2',
    name: 'Zur Storm',
    colors: 'WUB',
    isActive: true,
    performanceRating: 80,
    gamesPlayed: 10,
    owner: { id: 'u2', inAppName: 'Basti' },
  },
  {
    id: 'd1',
    name: 'Alesha Aggro',
    colors: 'RWB',
    isActive: true,
    performanceRating: 72,
    gamesPlayed: 8,
    owner: { id: 'u1', inAppName: 'Michi' },
  },
  {
    id: 'd3',
    name: 'Colorless Ramp',
    colors: 'C',
    isActive: true,
    performanceRating: 66,
    gamesPlayed: 5,
    owner: { id: 'u3', inAppName: 'Nina' },
  },
];

describe('deck-list-utils', () => {
  it('sorts decks by name', () => {
    const sorted = sortDecksByName(decks);
    expect(sorted.map((deck) => deck.id)).toEqual(['d1', 'd3', 'd2']);
  });

  it('filters decks by name, owner and colors', () => {
    expect(filterDecks(decks, 'aggro').map((deck) => deck.id)).toEqual(['d1']);
    expect(filterDecks(decks, 'basti').map((deck) => deck.id)).toEqual(['d2']);
    expect(filterDecks(decks, 'wub').map((deck) => deck.id)).toEqual(['d2']);
  });

  it('returns all decks for empty search term', () => {
    expect(filterDecks(decks, '   ')).toHaveLength(3);
  });

  it('filters stats decks with same behavior as deck filtering', () => {
    expect(filterStatsDecks(decks, 'michi').map((deck) => deck.id)).toEqual(['d1']);
  });

  it('calculates total pages and paginates decks', () => {
    expect(getDecksTotalPages(0, 10)).toBe(0);
    expect(getDecksTotalPages(21, 10)).toBe(3);
    expect(paginateDecks(sortDecksByName(decks), 2, 2).map((deck) => deck.id)).toEqual(['d2']);
  });
});
