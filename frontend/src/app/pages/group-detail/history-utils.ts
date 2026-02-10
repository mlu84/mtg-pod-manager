import { Game, GroupEvent } from '../../models/game.model';

export type HistoryItem =
  | { type: 'game'; date: Date; data: Game; gameNumber: number }
  | { type: 'event'; date: Date; data: GroupEvent };

export function buildHistoryItems(
  games: Game[],
  events: GroupEvent[],
  retentionDays: number,
  now: Date = new Date(),
): HistoryItem[] {
  const items: HistoryItem[] = [];
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  const gamesList = games.filter((game) => new Date(game.playedAt) >= cutoff);
  const totalGames = gamesList.length;

  for (let i = 0; i < gamesList.length; i++) {
    const game = gamesList[i];
    items.push({
      type: 'game',
      date: new Date(game.playedAt),
      data: game,
      gameNumber: totalGames - i,
    });
  }

  for (const event of events) {
    if (new Date(event.createdAt) < cutoff) {
      continue;
    }
    if (event.type !== 'GAME_RECORDED' && event.type !== 'GAME_UNDONE') {
      items.push({
        type: 'event',
        date: new Date(event.createdAt),
        data: event,
      });
    }
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items;
}

export function filterHistoryItems(
  items: HistoryItem[],
  filter: 'all' | 'games' | 'events',
): HistoryItem[] {
  if (filter === 'all') {
    return items;
  }
  if (filter === 'games') {
    return items.filter((item) => item.type === 'game');
  }
  return items.filter((item) => item.type === 'event');
}
