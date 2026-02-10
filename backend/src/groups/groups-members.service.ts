import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { GroupsMembershipService } from './groups-membership.service';

@Injectable()
export class GroupsMembersService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private membershipService: GroupsMembershipService,
  ) {}

  async removeMember(groupId: string, memberUserId: string, requestingUserId: string) {
    await this.membershipService.ensureAdmin(groupId, requestingUserId);

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

    await this.eventsService.log(
      groupId,
      'MEMBER_REMOVED',
      `${membershipToRemove.user.inAppName} was removed from the group`,
    );

    return { message: 'Member removed successfully' };
  }

  async updateMemberRole(
    groupId: string,
    memberUserId: string,
    role: 'ADMIN' | 'MEMBER',
    requestingUserId: string,
  ) {
    await this.membershipService.ensureAdmin(groupId, requestingUserId);

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
      `${membership.user.inAppName} was ${role === 'ADMIN' ? 'promoted to admin' : 'demoted to member'}`,
    );

    return { message: 'Member role updated' };
  }
}
