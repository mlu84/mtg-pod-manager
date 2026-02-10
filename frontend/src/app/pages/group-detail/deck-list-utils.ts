import { Deck } from '../../models/group.model';

function normalizeSearchTerm(term: string): string {
  return term.toLowerCase().trim();
}

export function sortDecksByName(decks: Deck[]): Deck[] {
  return [...decks].sort((a, b) => a.name.localeCompare(b.name));
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
