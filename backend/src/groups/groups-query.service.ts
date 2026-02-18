import { Injectable, NotFoundException } from '@nestjs/common';
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
    const membership = await this.membershipService.getMembershipOrThrow(userId, groupId);

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
      membershipRole: membership.role,
      winnersBanner: banner,
    });
  }
}
