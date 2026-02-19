import { Deck } from '../../models/group.model';
import { VALID_DECK_TYPES } from './deck-constants';
import { getSortedColors } from './color-utils';

type DeckSortMode = 'name' | 'type' | 'colors' | 'players';

const UNKNOWN_DECK_TYPE_LABEL = 'Unknown';
const COLOR_INDEX_MAP = new Map(
  ['W', 'U', 'B', 'R', 'G'].map((color, index) => [color, index])
);

function normalizeSearchTerm(term: string): string {
  return term.toLowerCase().trim();
}

function normalizeDeckType(type: string | undefined): string {
  return (type ?? '').trim().toLowerCase();
}

export function getDeckTypeLabel(type: string | undefined): string {
  const normalized = normalizeDeckType(type);
  if (!normalized) {
    return UNKNOWN_DECK_TYPE_LABEL;
  }

  const knownType = VALID_DECK_TYPES.find((entry) => entry.toLowerCase() === normalized);
  return knownType ?? UNKNOWN_DECK_TYPE_LABEL;
}

export function sortDecksByName(decks: Deck[]): Deck[] {
  return [...decks].sort((a, b) => a.name.localeCompare(b.name));
}

export function sortDecksByType(decks: Deck[]): Deck[] {
  return [...decks].sort((a, b) => {
    const typeLabelA = getDeckTypeLabel(a.type);
    const typeLabelB = getDeckTypeLabel(b.type);
    const isUnknownA = typeLabelA === UNKNOWN_DECK_TYPE_LABEL;
    const isUnknownB = typeLabelB === UNKNOWN_DECK_TYPE_LABEL;

    if (isUnknownA !== isUnknownB) {
      return isUnknownA ? 1 : -1;
    }

    const typeLabelCompare = typeLabelA.localeCompare(typeLabelB, undefined, {
      sensitivity: 'base',
    });
    if (typeLabelCompare !== 0) {
      return typeLabelCompare;
    }

    return a.name.localeCompare(b.name);
  });
}

export function sortDecksByPlayers(decks: Deck[]): Deck[] {
  return [...decks].sort((a, b) => {
    const ownerCompare = a.owner.inAppName.localeCompare(b.owner.inAppName, undefined, {
      sensitivity: 'base',
    });
    if (ownerCompare !== 0) {
      return ownerCompare;
    }

    return a.name.localeCompare(b.name);
  });
}

function getColorSortGroup(comboLength: number): number {
  if (comboLength >= 1 && comboLength <= 5) {
    return comboLength - 1;
  }
  return 5; // Colorless or invalid values come after WUBRG
}

function compareComboLetters(comboA: string, comboB: string): number {
  const maxLength = Math.max(comboA.length, comboB.length);
  for (let index = 0; index < maxLength; index += 1) {
    const letterA = comboA[index];
    const letterB = comboB[index];
    if (!letterA && !letterB) return 0;
    if (!letterA) return -1;
    if (!letterB) return 1;

    const rankA = COLOR_INDEX_MAP.get(letterA) ?? Number.MAX_SAFE_INTEGER;
    const rankB = COLOR_INDEX_MAP.get(letterB) ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
  }
  return comboA.localeCompare(comboB);
}

export function sortDecksByColorCombination(decks: Deck[]): Deck[] {
  return [...decks].sort((a, b) => {
    const comboA = getSortedColors(a.colors).join('');
    const comboB = getSortedColors(b.colors).join('');

    const groupA = getColorSortGroup(comboA.length);
    const groupB = getColorSortGroup(comboB.length);
    if (groupA !== groupB) {
      return groupA - groupB;
    }

    const comboCompare = compareComboLetters(comboA, comboB);
    if (comboCompare !== 0) {
      return comboCompare;
    }

    return a.name.localeCompare(b.name);
  });
}

export function sortDecks(decks: Deck[], mode: DeckSortMode): Deck[] {
  if (mode === 'colors') {
    return sortDecksByColorCombination(decks);
  }
  if (mode === 'players') {
    return sortDecksByPlayers(decks);
  }
  if (mode === 'type') {
    return sortDecksByType(decks);
  }
  return sortDecksByName(decks);
}

export function filterDecks(decks: Deck[], term: string): Deck[] {
  const searchTerm = normalizeSearchTerm(term);
  if (!searchTerm) {
    return decks;
  }

  return decks.filter((deck) =>
    deck.name.toLowerCase().includes(searchTerm) ||
    deck.owner.inAppName.toLowerCase().includes(searchTerm) ||
    deck.colors.toLowerCase().includes(searchTerm)
  );
}

export function filterStatsDecks(decks: Deck[], term: string): Deck[] {
  return filterDecks(decks, term);
}

export function getDecksTotalPages(totalDecks: number, pageSize: number): number {
  return Math.ceil(totalDecks / pageSize);
}

export function paginateDecks(decks: Deck[], page: number, pageSize: number): Deck[] {
  const start = (page - 1) * pageSize;
  return decks.slice(start, start + pageSize);
}
