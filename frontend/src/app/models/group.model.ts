export interface Group {
  id: string;
  name: string;
  format: string;
  description?: string;
  role: 'ADMIN' | 'MEMBER';
}

export interface GroupDetail extends Group {
  inviteCode?: string;
  members: GroupMember[];
  decks: Deck[];
  userRole: 'ADMIN' | 'MEMBER';
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
}

export interface CreateDeckRequest {
  name: string;
  colors: string;
  type?: string;
  groupId: string;
}

export interface UpdateDeckRequest {
  name?: string;
  colors?: string;
  type?: string;
  isActive?: boolean;
}
