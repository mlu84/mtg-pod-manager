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
  nextSeasonName?: string | null;
  nextSeasonStartsAt?: string | null;
  nextSeasonEndsAt?: string | null;
  nextSeasonIsSuccessive?: boolean;
  nextSeasonInterval?: SeasonInterval | null;
  nextSeasonIntermissionDays?: number;
  seasonPauseDays?: number;
  seasonPauseUntil?: string | null;
  role: 'ADMIN' | 'MEMBER';
}

export type SeasonInterval =
  | 'WEEKLY'
  | 'BI_WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'YEARLY';

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
      deckId?: string | null;
      deckName: string;
      ownerName: string;
      colors: string;
      deckImageUrl?: string | null;
    }[];
  } | null;
}

export interface GroupMember {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    inAppName: string;
    avatarUrl?: string | null;
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
  activeSeasonName?: string | null;
  activeSeasonEndsAt?: string | null;
  activeSeasonStartedAt?: string | null;
  nextSeasonName?: string | null;
  nextSeasonStartsAt?: string | null;
  nextSeasonEndsAt?: string | null;
  nextSeasonIsSuccessive?: boolean;
  nextSeasonInterval?: SeasonInterval | null;
  nextSeasonIntermissionDays?: number;
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

export type GroupInviteType = 'USER' | 'EMAIL';

export interface IncomingGroupInvite {
  id: string;
  createdAt: string;
  type: GroupInviteType;
  invitedEmail: string;
  group: {
    id: string;
    name: string;
    format: string;
  };
  inviter: {
    id: string;
    inAppName: string;
  };
}

export interface SentGroupInvite {
  id: string;
  createdAt: string;
  type: GroupInviteType;
  invitedEmail: string;
  invitedUser: {
    id: string;
    inAppName: string;
  } | null;
  group: {
    id: string;
    name: string;
    format: string;
  };
}

export interface InvitableUser {
  id: string;
  inAppName: string;
  avatarUrl?: string | null;
}

export interface InvitableUsersSearchResponse {
  items: InvitableUser[];
  infoMessage: string | null;
}

export interface GroupApplication {
  userId: string;
  user: {
    id: string;
    inAppName: string;
  };
  createdAt: string;
}

export interface IncomingGroupApplication {
  groupId: string;
  group: {
    id: string;
    name: string;
    format: string;
  };
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
  ownerId?: string;
}
