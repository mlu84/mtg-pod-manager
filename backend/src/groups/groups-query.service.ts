import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsMembershipService } from './groups-membership.service';
import { GroupsSeasonService } from './groups-season.service';
import { toImageDataUrl } from './groups-image.util';

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

    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      format: m.group.format,
      description: m.group.description,
      role: m.role,
      imageUrl: toImageDataUrl(m.group.groupImage, m.group.groupImageMime),
      activeSeasonEndsAt: m.group.activeSeasonEndsAt,
      activeSeasonName: m.group.activeSeasonName,
    }));
  }

  async search(query: string, userId: string, page?: string, pageSize?: string) {
    const trimmedQuery = (query || '').trim();
    if (!trimmedQuery) {
      return { items: [], total: 0, page: 1, pageSize: 10 };
    }

    const parsedPage = Number(page);
    const parsedPageSize = Number(pageSize);
    const safePage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const safePageSize =
      Number.isFinite(parsedPageSize) && parsedPageSize > 0
        ? Math.min(parsedPageSize, 20)
        : 10;

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
      items: items.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        format: g.format,
        memberCount: g._count.members,
        imageUrl: toImageDataUrl(g.groupImage, g.groupImageMime),
      })),
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

    const { groupImage, groupImageMime, ...groupData } = group;

    return {
      ...groupData,
      userRole: membership.role,
      inviteCode: membership.role === 'ADMIN' ? group.inviteCode : undefined,
      imageUrl: toImageDataUrl(groupImage, groupImageMime),
      winnersBanner: banner,
    };
  }
}
