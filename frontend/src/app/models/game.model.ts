export interface Game {
  id: string;
  playedAt: string;
  playerCount: number;
  placements: GamePlacement[];
}

export interface GamePlacement {
  rank: number;
  points: number;
  playerName?: string;
  deck: {
    id: string;
    name: string;
    colors: string;
  };
  user?: {
    id: string;
    inAppName: string;
  };
}

export interface RankingEntry {
  position: number;
  id: string;
  name: string;
  colors: string;
  type?: string;
  owner: {
    id: string;
    inAppName: string;
  };
  performanceRating: number;
  gamesPlayed: number;
  isActive: boolean;
}

export interface RankingEntryWithTrend extends RankingEntry {
  trend: 'up' | 'down' | 'same' | 'new';
  positionChange: number;
}

export interface CreateGameRequest {
  groupId: string;
  playedAt?: string;
  placements: {
    deckId: string;
    rank: number;
    playerName?: string;
  }[];
}

export interface GroupEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}
