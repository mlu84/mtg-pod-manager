import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  async searchGroups(query: string, page?: number, pageSize?: number) {
    const trimmedQuery = (query || '').trim();
    const safePage = Number.isFinite(page) && Number(page) > 0 ? Number(page) : 1;
    const safePageSize =
      Number.isFinite(pageSize) && Number(pageSize) > 0
        ? Math.min(Number(pageSize), 20)
        : 10;

    const where = trimmedQuery
      ? { name: { contains: trimmedQuery } }
      : {};

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
          members: {
            select: {
              userId: true,
              role: true,
              user: {
                select: {
                  id: true,
                  inAppName: true,
                  email: true,
                },
              },
            },
            orderBy: { assignedAt: 'asc' },
          },
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
        members: g.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          user: m.user,
        })),
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async deleteGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.gamePlacement.deleteMany({
        where: { game: { groupId } },
      });
      await tx.game.deleteMany({ where: { groupId } });
      await tx.deck.deleteMany({ where: { groupId } });
      await tx.groupEvent.deleteMany({ where: { groupId } });
      await tx.groupApplication.deleteMany({ where: { groupId } });
      await tx.usersOnGroups.deleteMany({ where: { groupId } });
      await tx.group.delete({ where: { id: groupId } });
    });

    return { message: 'Group deleted' };
  }

  async renameUser(userId: string, inAppName: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        inAppName,
        NOT: { id: userId },
      },
    });

    if (existing) {
      throw new ConflictException('This display name is already taken');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, inAppName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { inAppName },
    });

    const memberships = await this.prisma.usersOnGroups.findMany({
      where: { userId },
      select: { groupId: true },
    });

    await Promise.all(
      memberships.map((m) =>
        this.eventsService.log(
          m.groupId,
          'USER_RENAMED',
          `${user.inAppName} hei\u00dft jetzt ${inAppName}`,
        ),
      ),
    );

    return { message: 'User renamed' };
  }

  async updateMemberRole(groupId: string, userId: string, role: 'ADMIN' | 'MEMBER') {
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      include: {
        user: { select: { inAppName: true } },
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
        where: { groupId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('At least one admin must remain in the group');
      }
    }

    await this.prisma.usersOnGroups.update({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      data: { role },
    });

    await this.eventsService.log(
      groupId,
      role === 'ADMIN' ? 'MEMBER_PROMOTED' : 'MEMBER_DEMOTED',
      `${membership.user.inAppName} was ${role === 'ADMIN' ? 'promoted to admin' : 'demoted to member'}`,
    );

    return { message: 'Member role updated' };
  }

  async removeMember(groupId: string, userId: string) {
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      include: {
        user: { select: { inAppName: true } },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this group');
    }

    if (membership.role === 'ADMIN') {
      const adminCount = await this.prisma.usersOnGroups.count({
        where: { groupId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('At least one admin must remain in the group');
      }
    }

    await this.prisma.usersOnGroups.delete({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    await this.eventsService.log(
      groupId,
      'MEMBER_REMOVED',
      `${membership.user.inAppName} was removed from the group`,
    );

    return { message: 'Member removed' };
  }

  async deleteUserAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, inAppName: true, systemRole: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.systemRole === SystemRole.SYSADMIN) {
      throw new ForbiddenException('Cannot delete sysadmin account');
    }

    const memberships = await this.prisma.usersOnGroups.findMany({
      where: { userId },
      select: { groupId: true },
    });

    const deckIds = await this.prisma.deck.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, groupId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (deckIds.length > 0) {
        await tx.gamePlacement.updateMany({
          where: { deckId: { in: deckIds.map((d) => d.id) } },
          data: { deletedDeckName: 'Deleted Deck' },
        });
        await tx.deck.deleteMany({
          where: { id: { in: deckIds.map((d) => d.id) } },
        });
      }

      await tx.gamePlacement.updateMany({
        where: { userId },
        data: { userId: null },
      });

      await tx.groupApplication.deleteMany({ where: { userId } });
      await tx.usersOnGroups.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    await Promise.all(
      memberships.map((m) =>
        this.eventsService.log(
          m.groupId,
          'USER_ACCOUNT_DELETED',
          `User ${user.inAppName} was deleted`,
        ),
      ),
    );

    return { message: 'User deleted' };
  }
}
