export interface AnalyticsTopCount {
  label: string;
  count: number;
}

export interface AdminAnalyticsResponse {
  range: {
    from: string;
    to: string;
    bucket: 'hour' | 'day';
    labels: string[];
  };
  cards: {
    liveUsersNow: number;
    averageGroupsPerUser: number;
    activeSeasons: number;
  };
  series: {
    usersHistory: number[];
    groupsCreated: number[];
    decksCreated: number[];
    recordedGames: number[];
    invites: {
      email: number[];
      internal: number[];
      total: number[];
    };
    concurrentActiveUsers: number[];
  };
  rankings: {
    popularColorCombinations: AnalyticsTopCount[];
    mostPlayedColorCombinations: AnalyticsTopCount[];
    mostPlayedDeckTypes: AnalyticsTopCount[];
  };
}

export interface UserStatisticsResponse {
  range: {
    from: string;
    to: string;
    bucket: 'hour' | 'day';
    labels: string[];
  };
  decks: {
    userTotal: number;
    averageTotal: number;
    series: {
      user: number[];
      average: number[];
    };
  };
  games: {
    userTotal: number;
    averageTotal: number;
    series: {
      user: number[];
      average: number[];
    };
  };
  colors: {
    labels: string[];
    values: number[];
  };
  favoriteColorCombinations: AnalyticsTopCount[];
  performance: {
    userAverage: number;
    globalAverage: number;
  };
}
