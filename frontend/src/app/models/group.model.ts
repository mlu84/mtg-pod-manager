export interface Group {
  id: string;
  name: string;
  format: string;
  description?: string;
  historyRetentionDays?: number;
  imageUrl?: string | null;
  activeSeasonName?: string | null;
  activeSeasonEndsAt?: string | null;
  activeSeasonStartedAt?: string | null;
  seasonPauseDays?: number;
  seasonPauseUntil?: string | null;
  role: 'ADMIN' | 'MEMBER';
}

export interface GroupDetail extends Group {
  inviteCode?: string;
  members: GroupMember[];
  decks: Deck[];
  userRole: 'ADMIN' | 'MEMBER';
  lastSeasonId?: string | null;
  snapshotVisibleUntil?: string | null;
  snapshotVisibilityDays?: number;
  winnersBanner?: {
    seasonId: string;
    seasonName?: string | null;
    endedAt: string;
    winners: {
      position: number;
      deckName: string;
      ownerName: string;
      colors: string;
    }[];
  } | null;
}

export interface GroupMember {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    inAppName: string;
  };
}

export interface CreateGroupRequest {
  name: string;
  format: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  historyRetentionDays?: number;
  activeSeasonName?: string;
  activeSeasonEndsAt?: string;
  activeSeasonStartedAt?: string;
  seasonPauseDays?: number;
  snapshotVisibilityDays?: number;
}

export interface Deck {
  id: string;
  name: string;
  colors: string;
  type?: string;
  isActive: boolean;
  performanceRating: number;
  gamesPlayed: number;
  owner: {
    id: string;
    inAppName: string;
  };
  // Archidekt Integration
  archidektId?: string;
  archidektImageUrl?: string;
  archidektLastSync?: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  format: string;
  description?: string;
  imageUrl?: string | null;
}

export interface GroupSearchResult extends GroupSummary {
  memberCount: number;
}

export interface GroupSearchResponse {
  items: GroupSearchResult[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserGroupApplication {
  group: GroupSummary;
  createdAt: string;
}

export interface GroupApplication {
  userId: string;
  user: {
    id: string;
    inAppName: string;
  };
  createdAt: string;
}

export interface AdminGroupMember {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    inAppName: string;
    email: string;
  };
}

export interface AdminGroup {
  id: string;
  name: string;
  format: string;
  description?: string;
  members: AdminGroupMember[];
}

export interface AdminGroupSearchResponse {
  items: AdminGroup[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateDeckRequest {
  name: string;
  colors: string;
  type?: string;
  groupId: string;
  archidektUrl?: string;
}

export interface UpdateDeckRequest {
  name?: string;
  colors?: string;
  type?: string;
  isActive?: boolean;
  archidektUrl?: string;
}
