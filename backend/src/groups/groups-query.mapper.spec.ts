import { describe, expect, it } from 'vitest';
import {
  buildGroupDetailPayload,
  mapGroupMemberWithAvatar,
  mapGroupSearchItem,
  mapMembershipToGroupListItem,
} from './groups-query.mapper';

describe('groups-query.mapper', () => {
  it('maps membership list items', () => {
    const mapped = mapMembershipToGroupListItem({
      role: 'ADMIN',
      group: {
        id: 'g-1',
        name: 'Group',
        format: 'Commander',
        description: 'desc',
        groupImage: Buffer.from('img'),
        groupImageMime: 'image/png',
        activeSeasonEndsAt: null,
        activeSeasonName: 'Season 1',
      },
    });

    expect(mapped).toMatchObject({
      id: 'g-1',
      role: 'ADMIN',
      imageUrl: 'data:image/png;base64,aW1n',
    });
  });

  it('maps search items', () => {
    const mapped = mapGroupSearchItem({
      id: 'g-1',
      name: 'Group',
      description: null,
      format: 'Commander',
      groupImage: null,
      groupImageMime: null,
      _count: { members: 5 },
    });

    expect(mapped).toEqual({
      id: 'g-1',
      name: 'Group',
      description: null,
      format: 'Commander',
      memberCount: 5,
      imageUrl: null,
    });
  });

  it('maps members with avatar url and builds detail payload', () => {
    const member = mapGroupMemberWithAvatar({
      userId: 'u-1',
      role: 'MEMBER',
      user: {
        id: 'u-1',
        inAppName: 'Alice',
        avatarImage: Buffer.from('avatar'),
        avatarImageMime: 'image/webp',
      },
    });
    expect(member.user.avatarUrl).toBe('data:image/webp;base64,YXZhdGFy');

    const detail = buildGroupDetailPayload({
      group: {
        id: 'g-1',
        name: 'Group',
        inviteCode: 'code-1',
        groupImage: null,
        groupImageMime: null,
        members: [
          {
            userId: 'u-1',
            role: 'ADMIN',
            user: {
              id: 'u-1',
              inAppName: 'Alice',
              avatarImage: null,
              avatarImageMime: null,
            },
          },
        ],
      },
      membershipRole: 'ADMIN',
      winnersBanner: { seasonId: 's-1' },
    });

    expect(detail).toMatchObject({
      id: 'g-1',
      userRole: 'ADMIN',
      inviteCode: 'code-1',
      winnersBanner: { seasonId: 's-1' },
    });
  });
});

