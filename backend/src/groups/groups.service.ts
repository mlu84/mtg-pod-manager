import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
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
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.group,
      role: m.role,
    }));
  }

  async findOne(groupId: string, userId: string) {
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

    return {
      ...group,
      userRole: membership.role,
      inviteCode: membership.role === 'ADMIN' ? group.inviteCode : undefined,
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

  async update(groupId: string, updateGroupDto: UpdateGroupDto, userId: string) {
    await this.ensureAdmin(groupId, userId);

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: updateGroupDto,
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

      // 5. Delete all memberships
      await tx.usersOnGroups.deleteMany({
        where: { groupId },
      });

      // 6. Delete the group itself
      await tx.group.delete({
        where: { id: groupId },
      });
    });

    return { message: 'Group deleted successfully' };
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
}
