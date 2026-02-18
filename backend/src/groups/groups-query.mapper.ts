import { toImageDataUrl } from './groups-image.util';

type MembershipProjection = {
  role: string;
  group: {
    id: string;
    name: string;
    format: string;
    description: string | null;
    groupImage: Buffer | null;
    groupImageMime: string | null;
    activeSeasonEndsAt: Date | null;
    activeSeasonName: string | null;
  };
};

type GroupSearchProjection = {
  id: string;
  name: string;
  description: string | null;
  format: string;
  groupImage: Buffer | null;
  groupImageMime: string | null;
  _count: { members: number };
};

type GroupMemberProjection = {
  userId: string;
  role: string;
  user: {
    id: string;
    inAppName: string;
    avatarImage: Buffer | null;
    avatarImageMime: string | null;
  };
};

type GroupDetailProjection = {
  inviteCode?: string;
  groupImage: Buffer | null;
  groupImageMime: string | null;
  members: GroupMemberProjection[];
  [key: string]: unknown;
};

export function mapMembershipToGroupListItem(membership: MembershipProjection) {
  return {
    id: membership.group.id,
    name: membership.group.name,
    format: membership.group.format,
    description: membership.group.description,
    role: membership.role,
    imageUrl: toImageDataUrl(membership.group.groupImage, membership.group.groupImageMime),
    activeSeasonEndsAt: membership.group.activeSeasonEndsAt,
    activeSeasonName: membership.group.activeSeasonName,
  };
}

export function mapGroupSearchItem(group: GroupSearchProjection) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    format: group.format,
    memberCount: group._count.members,
    imageUrl: toImageDataUrl(group.groupImage, group.groupImageMime),
  };
}

export function mapGroupMemberWithAvatar(member: GroupMemberProjection) {
  return {
    userId: member.userId,
    role: member.role,
    user: {
      id: member.user.id,
      inAppName: member.user.inAppName,
      avatarUrl: toImageDataUrl(member.user.avatarImage, member.user.avatarImageMime),
    },
  };
}

export function buildGroupDetailPayload(args: {
  group: GroupDetailProjection;
  membershipRole: string;
  winnersBanner: unknown;
}) {
  const { group, membershipRole, winnersBanner } = args;
  const { groupImage, groupImageMime, members, ...groupData } = group;

  return {
    ...groupData,
    members: members.map(mapGroupMemberWithAvatar),
    userRole: membershipRole,
    inviteCode: membershipRole === 'ADMIN' ? group.inviteCode : undefined,
    imageUrl: toImageDataUrl(groupImage, groupImageMime),
    winnersBanner,
  };
}

