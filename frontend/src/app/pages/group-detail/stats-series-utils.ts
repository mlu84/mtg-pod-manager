import { Deck } from '../../models/group.model';
import { Game, GamePlacement } from '../../models/game.model';

export type DeckSeriesItem = { game: Game; placement: GamePlacement };

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function calculateNewPerformance(
  currentPerformance: number,
  gamesPlayed: number,
  newPoints: number,
): number {
  const newPerformance =
    (currentPerformance * gamesPlayed + newPoints) / (gamesPlayed + 1);
  return roundToOneDecimal(newPerformance);
}

export function getDeckSeries(
  games: Game[],
  deckId: string,
  limit = 10,
): DeckSeriesItem[] {
  const sortedGames = [...games].sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime(),
  );
  const series = sortedGames
    .map((game) => {
      const placement = game.placements.find((p) => p.deck?.id === deckId);
      return placement ? { game, placement } : null;
    })
    .filter((item): item is DeckSeriesItem => !!item);

  return series.slice(-limit);
}

export function getDeckRankSeries(
  games: Game[],
  decks: Deck[],
  deckId: string,
  limit = 10,
): { game: Game; rank: number }[] {
  const sortedGames = [...games].sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime(),
  );
  const stats = new Map<string, { name: string; games: number; performance: number }>();
  for (const deck of decks) {
    stats.set(deck.id, { name: deck.name, games: 0, performance: 0 });
  }

  const rankByGameId = new Map<string, number>();
  for (const game of sortedGames) {
    for (const placement of game.placements) {
      const placementDeck = placement.deck;
      if (!placementDeck?.id) continue;
      const entry = stats.get(placementDeck.id);
      if (!entry) continue;
      entry.performance = calculateNewPerformance(
        entry.performance,
        entry.games,
        placement.points,
      );
      entry.games += 1;
    }

    const ranked = [...stats.entries()].sort((a, b) => {
      const aStats = a[1];
      const bStats = b[1];
      if (bStats.performance !== aStats.performance) {
        return bStats.performance - aStats.performance;
      }
      if (bStats.games !== aStats.games) {
        return bStats.games - aStats.games;
      }
      return aStats.name.localeCompare(bStats.name);
    });

    const position = ranked.findIndex(([id]) => id === deckId);
    if (position >= 0) {
      rankByGameId.set(game.id, position + 1);
    }
  }

  return getDeckSeries(sortedGames, deckId, limit)
    .map((item) => {
      const rank = rankByGameId.get(item.game.id);
      return rank ? { game: item.game, rank } : null;
    })
    .filter((item): item is { game: Game; rank: number } => !!item);
}
