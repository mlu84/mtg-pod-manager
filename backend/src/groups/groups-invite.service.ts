import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { GroupsMembershipService } from './groups-membership.service';
import * as crypto from 'crypto';

@Injectable()
export class GroupsInviteService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private membershipService: GroupsMembershipService,
  ) {}

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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { inAppName: true, email: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.usersOnGroups.create({
        data: {
          userId,
          groupId: group.id,
          role: 'MEMBER',
        },
      });

      const normalizedEmail = user?.email?.trim().toLowerCase();
      await tx.groupInvite.deleteMany({
        where: {
          groupId: group.id,
          OR: [
            { invitedUserId: userId },
            ...(normalizedEmail ? [{ invitedEmail: normalizedEmail }] : []),
          ],
        },
      });
    });

    await this.eventsService.log(
      group.id,
      'MEMBER_JOINED',
      `${user?.inAppName || 'Unknown'} joined the group`,
    );

    return {
      message: 'Successfully joined the group',
      groupId: group.id,
      groupName: group.name,
    };
  }

  async regenerateInviteCode(groupId: string, userId: string) {
    await this.membershipService.ensureAdmin(groupId, userId);

    const newCode = crypto.randomBytes(8).toString('hex');

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: { inviteCode: newCode },
    });

    return { inviteCode: group.inviteCode };
  }
}
