import { Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsMembershipService } from './groups-membership.service';
import { GroupsSeasonService } from './groups-season.service';
import {
  buildGroupDetailPayload,
  mapGroupSearchItem,
  mapMembershipToGroupListItem,
} from './groups-query.mapper';
import { resolveSearchPagination } from './groups-query.util';

@Injectable()
export class GroupsQueryService {
  constructor(
    private prisma: PrismaService,
    private membershipService: GroupsMembershipService,
    private seasonService: GroupsSeasonService,
  ) {}

  async findAllForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { systemRole: true },
    });

    if (user?.systemRole === SystemRole.SYSADMIN) {
      return this.findAllForSysadmin(userId);
    }

    const memberships = await this.prisma.usersOnGroups.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            format: true,
            description: true,
            groupImage: true,
            groupImageMime: true,
            activeSeasonEndsAt: true,
            activeSeasonName: true,
          },
        },
      },
    });

    return memberships.map(mapMembershipToGroupListItem);
  }

  private async findAllForSysadmin(userId: string) {
    const groups = await this.prisma.group.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        format: true,
        description: true,
        groupImage: true,
        groupImageMime: true,
        activeSeasonEndsAt: true,
        activeSeasonName: true,
        nextSeasonName: true,
        nextSeasonStartsAt: true,
        nextSeasonEndsAt: true,
        createdAt: true,
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
        _count: {
          select: { members: true },
        },
      },
    });

    const groupIds = groups.map((group) => group.id);
    if (groupIds.length === 0) {
      return [];
    }

    const [gamesByGroup, decksByGroup, joinsByGroup, memberEventsByGroup] =
      await this.prisma.$transaction([
        this.prisma.game.groupBy({
          by: ['groupId'],
          where: { groupId: { in: groupIds } },
          orderBy: { groupId: 'asc' },
          _max: { createdAt: true },
        }),
        this.prisma.deck.groupBy({
          by: ['groupId'],
          where: { groupId: { in: groupIds } },
          orderBy: { groupId: 'asc' },
          _max: { updatedAt: true },
        }),
        this.prisma.usersOnGroups.groupBy({
          by: ['groupId'],
          where: { groupId: { in: groupIds } },
          orderBy: { groupId: 'asc' },
          _max: { assignedAt: true },
        }),
        this.prisma.groupEvent.groupBy({
          by: ['groupId'],
          where: {
            groupId: { in: groupIds },
            type: { in: ['MEMBER_LEFT', 'MEMBER_REMOVED', 'MEMBER_JOINED'] },
          },
          orderBy: { groupId: 'asc' },
          _max: { createdAt: true },
        }),
      ]);

    const gameMap = new Map(gamesByGroup.map((row) => [row.groupId, row._max?.createdAt ?? null]));
    const deckMap = new Map(decksByGroup.map((row) => [row.groupId, row._max?.updatedAt ?? null]));
    const joinMap = new Map(joinsByGroup.map((row) => [row.groupId, row._max?.assignedAt ?? null]));
    const memberEventMap = new Map(
      memberEventsByGroup.map((row) => [row.groupId, row._max?.createdAt ?? null]),
    );

    const now = new Date();
    const inactivityThreshold = new Date(now);
    inactivityThreshold.setMonth(inactivityThreshold.getMonth() - 6);

    return groups.map((group) => {
      const lastActivityAt = this.maxDate([
        group.createdAt,
        gameMap.get(group.id) ?? null,
        deckMap.get(group.id) ?? null,
        joinMap.get(group.id) ?? null,
        memberEventMap.get(group.id) ?? null,
      ]);
      const membershipRole = group.members[0]?.role;
      const isSysadminReadonly = !membershipRole;
      const hasActiveOrPlannedSeason =
        Boolean(group.activeSeasonName && group.activeSeasonEndsAt && group.activeSeasonEndsAt > now) ||
        Boolean(group.nextSeasonName || group.nextSeasonStartsAt || group.nextSeasonEndsAt);

      return {
        id: group.id,
        name: group.name,
        format: group.format,
        description: group.description,
        role: membershipRole === 'ADMIN' ? 'ADMIN' : 'MEMBER',
        isSysadminReadonly,
        imageUrl: mapGroupSearchItem({
          id: group.id,
          name: group.name,
          description: group.description,
          format: group.format,
          groupImage: group.groupImage,
          groupImageMime: group.groupImageMime,
          _count: { members: group._count.members },
        }).imageUrl,
        activeSeasonEndsAt: group.activeSeasonEndsAt,
        activeSeasonName: group.activeSeasonName,
        nextSeasonName: group.nextSeasonName,
        nextSeasonStartsAt: group.nextSeasonStartsAt,
        nextSeasonEndsAt: group.nextSeasonEndsAt,
        memberCount: group._count.members,
        lastActivityAt,
        isInactive: lastActivityAt.getTime() <= inactivityThreshold.getTime(),
        hasActiveOrPlannedSeason,
      };
    });
  }

  async search(query: string, userId: string, page?: number, pageSize?: number) {
    const trimmedQuery = (query || '').trim();
    if (!trimmedQuery) {
      return { items: [], total: 0, page: 1, pageSize: 10 };
    }

    const { page: safePage, pageSize: safePageSize } = resolveSearchPagination(
      page,
      pageSize,
    );

    const where = {
      name: { contains: trimmedQuery },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.group.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        select: {
          id: true,
          name: true,
          description: true,
          format: true,
          groupImage: true,
          groupImageMime: true,
          _count: { select: { members: true } },
        },
      }),
      this.prisma.group.count({ where }),
    ]);

    return {
      items: items.map(mapGroupSearchItem),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async findOne(groupId: string, userId: string) {
    await this.seasonService.ensureSeasonUpToDate(groupId);
    const access = await this.membershipService.ensureCanReadGroup(userId, groupId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                inAppName: true,
                avatarImage: true,
                avatarImageMime: true,
              },
            },
          },
        },
        decks: {
          select: {
            id: true,
            name: true,
            colors: true,
            type: true,
            isActive: true,
            performanceRating: true,
            gamesPlayed: true,
            archidektId: true,
            archidektImageUrl: true,
            archidektLastSync: true,
            owner: {
              select: {
                id: true,
                inAppName: true,
              },
            },
          },
          orderBy: [
            { isActive: 'desc' },
            { performanceRating: 'desc' },
          ],
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const banner = await this.seasonService.getWinnersBanner(groupId, userId);

    return buildGroupDetailPayload({
      group,
      membershipRole: access.role,
      isSysadminReadonly: access.isSysadminReadonly,
      winnersBanner: banner,
    });
  }

  private maxDate(values: Array<Date | null | undefined>): Date {
    const filtered = values.filter((value): value is Date => value instanceof Date);
    if (filtered.length === 0) {
      return new Date(0);
    }
    return filtered.reduce((latest, current) =>
      current.getTime() > latest.getTime() ? current : latest
    );
  }
}
