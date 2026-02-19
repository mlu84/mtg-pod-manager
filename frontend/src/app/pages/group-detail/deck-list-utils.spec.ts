import { describe, expect, it } from 'vitest';
import { Deck } from '../../models/group.model';
import {
  filterDecks,
  filterStatsDecks,
  getDeckTypeLabel,
  getDecksTotalPages,
  paginateDecks,
  sortDecks,
  sortDecksByColorCombination,
  sortDecksByName,
  sortDecksByPlayers,
  sortDecksByType,
} from './deck-list-utils';

const decks: Deck[] = [
  {
    id: 'd2',
    name: 'Zur Storm',
    colors: 'WUB',
    type: 'Tempo',
    isActive: true,
    performanceRating: 80,
    gamesPlayed: 10,
    owner: { id: 'u2', inAppName: 'Basti' },
  },
  {
    id: 'd1',
    name: 'Alesha Aggro',
    colors: 'RWB',
    type: 'Aggro',
    isActive: true,
    performanceRating: 72,
    gamesPlayed: 8,
    owner: { id: 'u1', inAppName: 'Michi' },
  },
  {
    id: 'd3',
    name: 'Colorless Ramp',
    colors: 'C',
    type: 'Control',
    isActive: true,
    performanceRating: 66,
    gamesPlayed: 5,
    owner: { id: 'u3', inAppName: 'Nina' },
  },
  {
    id: 'd4',
    name: 'Wild Meta',
    colors: 'UG',
    type: 'UnknownCustomType',
    isActive: true,
    performanceRating: 70,
    gamesPlayed: 4,
    owner: { id: 'u4', inAppName: 'Pia' },
  },
  {
    id: 'd6',
    name: 'Big Mana',
    colors: 'G',
    type: 'Battlecruiser',
    isActive: true,
    performanceRating: 63,
    gamesPlayed: 2,
    owner: { id: 'u6', inAppName: 'Lia' },
  },
  {
    id: 'd5',
    name: 'No Type Deck',
    colors: 'BR',
    isActive: true,
    performanceRating: 61,
    gamesPlayed: 3,
    owner: { id: 'u5', inAppName: 'Tom' },
  },
];

describe('deck-list-utils', () => {
  it('sorts decks by name', () => {
    const sorted = sortDecksByName(decks);
    expect(sorted.map((deck) => deck.id)).toEqual(['d1', 'd6', 'd3', 'd5', 'd4', 'd2']);
  });

  it('sorts decks by deck type alphabetically with unknown types at the end', () => {
    const sorted = sortDecksByType(decks);
    expect(sorted.map((deck) => deck.id)).toEqual(['d1', 'd6', 'd3', 'd2', 'd5', 'd4']);
  });

  it('sorts decks by owner name ascending', () => {
    const sorted = sortDecksByPlayers(decks);
    expect(sorted.map((deck) => deck.id)).toEqual(['d2', 'd6', 'd1', 'd3', 'd4', 'd5']);
  });

  it('supports name, type and players sort mode', () => {
    expect(sortDecks(decks, 'name').map((deck) => deck.id)).toEqual(['d1', 'd6', 'd3', 'd5', 'd4', 'd2']);
    expect(sortDecks(decks, 'type').map((deck) => deck.id)).toEqual(['d1', 'd6', 'd3', 'd2', 'd5', 'd4']);
    expect(sortDecks(decks, 'players').map((deck) => deck.id)).toEqual(['d2', 'd6', 'd1', 'd3', 'd4', 'd5']);
  });

  it('sorts decks by color combination from mono to WUBRG', () => {
    const colorSortDecks: Deck[] = [
      {
        id: 'c1',
        name: 'Mono Blue',
        colors: 'U',
        isActive: true,
        performanceRating: 0,
        gamesPlayed: 0,
        owner: { id: 'u1', inAppName: 'A' },
      },
      {
        id: 'c2',
        name: 'Five Color',
        colors: 'WUBRG',
        isActive: true,
        performanceRating: 0,
        gamesPlayed: 0,
        owner: { id: 'u2', inAppName: 'B' },
      },
      {
        id: 'c3',
        name: 'Tri Color',
        colors: 'UBG',
        isActive: true,
        performanceRating: 0,
        gamesPlayed: 0,
        owner: { id: 'u3', inAppName: 'C' },
      },
      {
        id: 'c4',
        name: 'Dual Color',
        colors: 'BR',
        isActive: true,
        performanceRating: 0,
        gamesPlayed: 0,
        owner: { id: 'u4', inAppName: 'D' },
      },
      {
        id: 'c5',
        name: 'Mono White',
        colors: 'W',
        isActive: true,
        performanceRating: 0,
        gamesPlayed: 0,
        owner: { id: 'u5', inAppName: 'E' },
      },
      {
        id: 'c6',
        name: 'Four Color',
        colors: 'WUBR',
        isActive: true,
        performanceRating: 0,
        gamesPlayed: 0,
        owner: { id: 'u6', inAppName: 'F' },
      },
      {
        id: 'c7',
        name: 'Colorless',
        colors: 'C',
        isActive: true,
        performanceRating: 0,
        gamesPlayed: 0,
        owner: { id: 'u7', inAppName: 'G' },
      },
    ];

    expect(sortDecksByColorCombination(colorSortDecks).map((deck) => deck.id)).toEqual([
      'c5',
      'c1',
      'c4',
      'c3',
      'c6',
      'c2',
      'c7',
    ]);
    expect(sortDecks(colorSortDecks, 'colors').map((deck) => deck.id)).toEqual([
      'c5',
      'c1',
      'c4',
      'c3',
      'c6',
      'c2',
      'c7',
    ]);
  });

  it('maps unknown or empty types to Unknown label', () => {
    expect(getDeckTypeLabel('Tempo')).toBe('Tempo');
    expect(getDeckTypeLabel(' custom ')).toBe('Unknown');
    expect(getDeckTypeLabel('')).toBe('Unknown');
    expect(getDeckTypeLabel(undefined)).toBe('Unknown');
  });

  it('filters decks by name, owner and colors', () => {
    expect(filterDecks(decks, 'aggro').map((deck) => deck.id)).toEqual(['d1']);
    expect(filterDecks(decks, 'basti').map((deck) => deck.id)).toEqual(['d2']);
    expect(filterDecks(decks, 'wub').map((deck) => deck.id)).toEqual(['d2']);
  });

  it('returns all decks for empty search term', () => {
    expect(filterDecks(decks, '   ')).toHaveLength(6);
  });

  it('filters stats decks with same behavior as deck filtering', () => {
    expect(filterStatsDecks(decks, 'michi').map((deck) => deck.id)).toEqual(['d1']);
  });

  it('calculates total pages and paginates decks', () => {
    expect(getDecksTotalPages(0, 10)).toBe(0);
    expect(getDecksTotalPages(21, 10)).toBe(3);
    expect(paginateDecks(sortDecksByName(decks), 2, 2).map((deck) => deck.id)).toEqual(['d3', 'd5']);
  });
});
