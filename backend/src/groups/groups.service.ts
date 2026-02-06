import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import * as crypto from 'crypto';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  private toImageDataUrl(
    image: Buffer | null | undefined,
    mime: string | null | undefined,
  ): string | null {
    if (!image || !mime) return null;
    const base64 = image.toString('base64');
    return `data:${mime};base64,${base64}`;
  }

  async create(createGroupDto: CreateGroupDto, userId: string) {
    const group = await this.prisma.group.create({
      data: {
        name: createGroupDto.name,
        format: createGroupDto.format,
        description: createGroupDto.description,
        members: {
          create: {
            userId: userId,
            role: 'ADMIN',
          },
        },
      },
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
      },
    });

    return group;
  }

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
      imageUrl: this.toImageDataUrl(m.group.groupImage, m.group.groupImageMime),
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
        imageUrl: this.toImageDataUrl(g.groupImage, g.groupImageMime),
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async findOne(groupId: string, userId: string) {
    await this.ensureSeasonUpToDate(groupId);
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

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
            { isActive: 'desc' },  // Active decks first
            { performanceRating: 'desc' },
          ],
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const banner = await this.getWinnersBanner(groupId, userId);

    const {
      groupImage,
      groupImageMime,
      ...groupData
    } = group;

    return {
      ...groupData,
      userRole: membership.role,
      inviteCode: membership.role === 'ADMIN' ? group.inviteCode : undefined,
      imageUrl: this.toImageDataUrl(groupImage, groupImageMime),
      winnersBanner: banner,
    };
  }

  async joinByCode(inviteCode: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
    });

    if (!group) {
      throw new NotFoundException('Invalid invite code');
    }

    const existingMembership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: group.id,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('You are already a member of this group');
    }

    // Get user name for the event
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { inAppName: true },
    });

    await this.prisma.usersOnGroups.create({
      data: {
        userId,
        groupId: group.id,
        role: 'MEMBER',
      },
    });

    // Log event
    await this.eventsService.log(
      group.id,
      'MEMBER_JOINED',
      `${user?.inAppName || 'Unbekannt'} ist der Gruppe beigetreten`,
    );

    return {
      message: 'Successfully joined the group',
      groupId: group.id,
      groupName: group.name,
    };
  }

  async createApplication(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const existingMembership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('You are already a member of this group');
    }

    const existingApplication = await this.prisma.groupApplication.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (existingApplication) {
      throw new ConflictException('You already have an open application');
    }

    await this.prisma.groupApplication.create({
      data: {
        userId,
        groupId,
      },
    });

    return { message: 'Application submitted successfully' };
  }

  async getApplications(groupId: string, userId: string) {
    await this.ensureAdmin(groupId, userId);

    try {
      const applications = await this.prisma.groupApplication.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              inAppName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return applications.map((app) => ({
        userId: app.userId,
        user: app.user,
        createdAt: app.createdAt,
      }));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2021'
      ) {
        return [];
      }
      throw error;
    }
  }

  async acceptApplication(groupId: string, applicantUserId: string, adminUserId: string) {
    await this.ensureAdmin(groupId, adminUserId);

    const application = await this.prisma.groupApplication.findUnique({
      where: {
        userId_groupId: {
          userId: applicantUserId,
          groupId,
        },
      },
      include: {
        user: { select: { inAppName: true } },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const existingMembership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId: applicantUserId,
          groupId,
        },
      },
    });

    if (existingMembership) {
      await this.prisma.groupApplication.delete({
        where: {
          userId_groupId: {
            userId: applicantUserId,
            groupId,
          },
        },
      });
      return { message: 'User is already a member' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.usersOnGroups.create({
        data: {
          userId: applicantUserId,
          groupId,
          role: 'MEMBER',
        },
      });

      await tx.groupApplication.delete({
        where: {
          userId_groupId: {
            userId: applicantUserId,
            groupId,
          },
        },
      });
    });

    await this.eventsService.log(
      groupId,
      'APPLICATION_ACCEPTED',
      `${application.user.inAppName} wurde in die Gruppe aufgenommen`,
    );

    return { message: 'Application accepted' };
  }

  async rejectApplication(groupId: string, applicantUserId: string, adminUserId: string) {
    await this.ensureAdmin(groupId, adminUserId);

    const application = await this.prisma.groupApplication.findUnique({
      where: {
        userId_groupId: {
          userId: applicantUserId,
          groupId,
        },
      },
      include: {
        user: { select: { inAppName: true } },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    await this.prisma.groupApplication.delete({
      where: {
        userId_groupId: {
          userId: applicantUserId,
          groupId,
        },
      },
    });

    await this.eventsService.log(
      groupId,
      'APPLICATION_REJECTED',
      `${application.user.inAppName} wurde abgelehnt`,
    );

    return { message: 'Application rejected' };
  }

  async update(groupId: string, updateGroupDto: UpdateGroupDto, userId: string) {
    await this.ensureAdmin(groupId, userId);

    let seasonStart =
      updateGroupDto.activeSeasonStartedAt
        ? new Date(updateGroupDto.activeSeasonStartedAt)
        : undefined;
    const seasonEnd =
      updateGroupDto.activeSeasonEndsAt
        ? new Date(updateGroupDto.activeSeasonEndsAt)
        : undefined;

    if (seasonEnd && !seasonStart) {
      seasonStart = new Date();
    }

    if (seasonStart && seasonEnd) {
      if (seasonEnd.getTime() <= seasonStart.getTime()) {
        throw new BadRequestException('Season end must be after start');
      }
      const maxDuration = 365 * 24 * 60 * 60 * 1000;
      if (seasonEnd.getTime() - seasonStart.getTime() > maxDuration) {
        throw new BadRequestException('Season length cannot exceed 1 year');
      }
    }

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        name: updateGroupDto.name,
        description: updateGroupDto.description,
        historyRetentionDays: updateGroupDto.historyRetentionDays,
        activeSeasonName: updateGroupDto.activeSeasonName,
        activeSeasonEndsAt: seasonEnd,
        activeSeasonStartedAt: seasonStart,
        seasonPauseDays: updateGroupDto.seasonPauseDays,
      },
    });

    return group;
  }

  async removeMember(groupId: string, memberUserId: string, requestingUserId: string) {
    await this.ensureAdmin(groupId, requestingUserId);

    if (memberUserId === requestingUserId) {
      throw new ForbiddenException('You cannot remove yourself from the group');
    }

    const membershipToRemove = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId: memberUserId,
          groupId,
        },
      },
      include: {
        user: {
          select: { inAppName: true },
        },
      },
    });

    if (!membershipToRemove) {
      throw new NotFoundException('Member not found in this group');
    }

    await this.prisma.usersOnGroups.delete({
      where: {
        userId_groupId: {
          userId: memberUserId,
          groupId,
        },
      },
    });

    // Log event
    await this.eventsService.log(
      groupId,
      'MEMBER_REMOVED',
      `${membershipToRemove.user.inAppName} wurde aus der Gruppe entfernt`,
    );

    return { message: 'Member removed successfully' };
  }

  async updateMemberRole(
    groupId: string,
    memberUserId: string,
    role: 'ADMIN' | 'MEMBER',
    requestingUserId: string,
  ) {
    await this.ensureAdmin(groupId, requestingUserId);

    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId: memberUserId,
          groupId,
        },
      },
      include: {
        user: {
          select: { inAppName: true },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this group');
    }

    if (membership.role === role) {
      return { message: 'Member role already set' };
    }

    if (membership.role === 'ADMIN' && role === 'MEMBER') {
      const adminCount = await this.prisma.usersOnGroups.count({
        where: {
          groupId,
          role: 'ADMIN',
        },
      });

      if (adminCount <= 1) {
        throw new ForbiddenException('At least one admin must remain in the group');
      }
    }

    await this.prisma.usersOnGroups.update({
      where: {
        userId_groupId: {
          userId: memberUserId,
          groupId,
        },
      },
      data: {
        role,
      },
    });

    await this.eventsService.log(
      groupId,
      role === 'ADMIN' ? 'MEMBER_PROMOTED' : 'MEMBER_DEMOTED',
      `${membership.user.inAppName} wurde ${role === 'ADMIN' ? 'zum Admin befördert' : 'zum Mitglied degradiert'}`,
    );

    return { message: 'Member role updated' };
  }

  async regenerateInviteCode(groupId: string, userId: string) {
    await this.ensureAdmin(groupId, userId);

    const newCode = crypto.randomBytes(8).toString('hex');

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: { inviteCode: newCode },
    });

    return { inviteCode: group.inviteCode };
  }

  async remove(groupId: string, userId: string) {
    await this.ensureAdmin(groupId, userId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Delete everything in a transaction (order matters due to foreign keys)
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete all game placements for games in this group
      await tx.gamePlacement.deleteMany({
        where: {
          game: {
            groupId,
          },
        },
      });

      // 2. Delete all games in this group
      await tx.game.deleteMany({
        where: { groupId },
      });

      // 3. Delete all decks in this group
      await tx.deck.deleteMany({
        where: { groupId },
      });

      // 4. Delete all events
      await tx.groupEvent.deleteMany({
        where: { groupId },
      });

      // 5. Delete all applications
      await tx.groupApplication.deleteMany({
        where: { groupId },
      });

      // 6. Delete all memberships
      await tx.usersOnGroups.deleteMany({
        where: { groupId },
      });

      // 7. Delete the group itself
      await tx.group.delete({
        where: { id: groupId },
      });
    });

    return { message: 'Group deleted successfully' };
  }

  async updateGroupImage(
    groupId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    await this.ensureAdmin(groupId, userId);

    if (!file) {
      throw new BadRequestException('No image provided');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported image type');
    }

    const updated = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        groupImage: file.buffer,
        groupImageMime: file.mimetype,
      },
      select: {
        groupImage: true,
        groupImageMime: true,
      },
    });

    return {
      imageUrl: this.toImageDataUrl(updated.groupImage, updated.groupImageMime),
    };
  }

  private async ensureAdmin(groupId: string, userId: string) {
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }

  async ensureSeasonUpToDate(groupId: string): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        activeSeasonEndsAt: true,
        activeSeasonStartedAt: true,
        activeSeasonName: true,
        seasonPauseDays: true,
        seasonPauseUntil: true,
      },
    });

    if (!group?.activeSeasonEndsAt || !group.activeSeasonStartedAt) {
      return;
    }

    const now = new Date();
    if (now < group.activeSeasonEndsAt) {
      return;
    }

    const snapshot = await this.createSeasonSnapshot(groupId, group.activeSeasonStartedAt, group.activeSeasonEndsAt, group.activeSeasonName);

    const durationMs = Math.max(
      group.activeSeasonEndsAt.getTime() - group.activeSeasonStartedAt.getTime(),
      24 * 60 * 60 * 1000,
    );
    const pauseDays = group.seasonPauseDays ?? 0;
    const pauseUntil = pauseDays > 0
      ? new Date(now.getTime() + pauseDays * 24 * 60 * 60 * 1000)
      : null;
    const newStart = pauseUntil ?? new Date();
    const newEnd = new Date(newStart.getTime() + durationMs);

    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        lastSeasonId: snapshot.id,
        activeSeasonName: null,
        activeSeasonStartedAt: newStart,
        activeSeasonEndsAt: newEnd,
        seasonPauseUntil: pauseUntil,
      },
    });

    await this.eventsService.log(
      groupId,
      'SEASON_RESET',
      `Season wurde zur\u00fcckgesetzt`,
    );
  }

  async resetSeason(groupId: string, userId: string): Promise<void> {
    await this.ensureAdmin(groupId, userId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        activeSeasonEndsAt: true,
        activeSeasonStartedAt: true,
        activeSeasonName: true,
        seasonPauseDays: true,
      },
    });

    if (!group?.activeSeasonStartedAt || !group.activeSeasonEndsAt) {
      throw new BadRequestException('Season is not configured');
    }

    const now = new Date();
    const snapshot = await this.createSeasonSnapshot(
      groupId,
      group.activeSeasonStartedAt,
      now,
      group.activeSeasonName,
    );

    const durationMs = Math.max(
      group.activeSeasonEndsAt.getTime() - group.activeSeasonStartedAt.getTime(),
      24 * 60 * 60 * 1000,
    );
    const pauseDays = group.seasonPauseDays ?? 0;
    const pauseUntil = pauseDays > 0
      ? new Date(now.getTime() + pauseDays * 24 * 60 * 60 * 1000)
      : null;
    const newStart = pauseUntil ?? new Date();
    const newEnd = new Date(newStart.getTime() + durationMs);

    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        lastSeasonId: snapshot.id,
        activeSeasonName: null,
        activeSeasonStartedAt: newStart,
        activeSeasonEndsAt: newEnd,
        seasonPauseUntil: pauseUntil,
      },
    });

    await this.eventsService.log(
      groupId,
      'SEASON_RESET',
      `Season wurde manuell zur\u00fcckgesetzt`,
    );
  }

  private async createSeasonSnapshot(
    groupId: string,
    startedAt: Date,
    endedAt: Date,
    name?: string | null,
  ) {
    const decks = await this.prisma.deck.findMany({
      where: { groupId },
      include: { owner: { select: { inAppName: true } } },
      orderBy: [
        { performanceRating: 'desc' },
        { gamesPlayed: 'desc' },
      ],
    });

    const snapshot = await this.prisma.groupSeason.create({
      data: {
        groupId,
        name: name || null,
        startedAt,
        endedAt,
        decks: {
          create: decks.map((deck, index) => ({
            deckId: deck.id,
            deckName: deck.name,
            colors: deck.colors,
            ownerName: deck.owner.inAppName,
            performanceRating: deck.performanceRating,
            gamesPlayed: deck.gamesPlayed,
            position: index + 1,
          })),
        },
      },
    });

    await this.prisma.deck.updateMany({
      where: { groupId },
      data: {
        performanceRating: 0,
        gamesPlayed: 0,
      },
    });

    return snapshot;
  }

  async getLastSeasonRanking(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        lastSeasonId: true,
      },
    });

    if (!group?.lastSeasonId) {
      return [];
    }

    const snapshot = await this.prisma.groupSeason.findUnique({
      where: { id: group.lastSeasonId },
      include: {
        decks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!snapshot) return [];

    return snapshot.decks.map((d) => ({
      position: d.position,
      id: d.deckId,
      name: d.deckName,
      colors: d.colors,
      type: null,
      owner: { id: d.deckId, inAppName: d.ownerName },
      performanceRating: d.performanceRating,
      gamesPlayed: d.gamesPlayed,
      isActive: true,
    }));
  }

  private async getWinnersBanner(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { lastSeasonId: true },
    });

    if (!group?.lastSeasonId) return null;

    const snapshot = await this.prisma.groupSeason.findUnique({
      where: { id: group.lastSeasonId },
      include: {
        decks: {
          orderBy: { position: 'asc' },
          take: 3,
        },
        dismissals: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!snapshot) return null;

    const twoWeeks = 14 * 24 * 60 * 60 * 1000;
    if (new Date().getTime() - snapshot.endedAt.getTime() > twoWeeks) {
      return null;
    }

    if (snapshot.dismissals.length > 0) {
      return null;
    }

    return {
      seasonId: snapshot.id,
      seasonName: snapshot.name || null,
      endedAt: snapshot.endedAt,
      winners: snapshot.decks.map((d) => ({
        position: d.position,
        deckName: d.deckName,
        ownerName: d.ownerName,
        colors: d.colors,
      })),
    };
  }

  async dismissWinnersBanner(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { lastSeasonId: true },
    });
    if (!group?.lastSeasonId) return;

    await this.prisma.groupSeasonDismissal.upsert({
      where: {
        seasonId_userId: {
          seasonId: group.lastSeasonId,
          userId,
        },
      },
      update: {},
      create: {
        seasonId: group.lastSeasonId,
        userId,
      },
    });
  }
}
