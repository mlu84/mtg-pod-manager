import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsInvitationsPolicyService {
  constructor(private prisma: PrismaService) {}

  normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  ensureInviteReceiver(
    invite: { invitedUserId: string | null; invitedEmail: string },
    userId: string,
    userEmail: string,
  ): void {
    const normalizedUserEmail = this.normalizeEmail(userEmail);
    const normalizedInviteEmail = this.normalizeEmail(invite.invitedEmail);

    if (invite.invitedUserId && invite.invitedUserId !== userId) {
      throw new ForbiddenException('This invite is not assigned to your account');
    }

    if (!invite.invitedUserId && normalizedInviteEmail !== normalizedUserEmail) {
      throw new ForbiddenException('This invite is not assigned to your account');
    }
  }

  async ensureInvitable(
    groupId: string,
    targetUserId: string | null,
    targetEmail: string,
  ): Promise<void> {
    if (targetUserId) {
      const existingMembership = await this.prisma.usersOnGroups.findUnique({
        where: {
          userId_groupId: {
            userId: targetUserId,
            groupId,
          },
        },
      });
      if (existingMembership) {
        throw new ConflictException('This user is already a member of this group');
      }

      const existingApplication = await this.prisma.groupApplication.findUnique({
        where: {
          userId_groupId: {
            userId: targetUserId,
            groupId,
          },
        },
      });
      if (existingApplication) {
        throw new ConflictException('User already has an open application for this group');
      }
    } else {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: targetEmail },
        select: { id: true },
      });

      if (existingUser) {
        const [existingMembership, existingApplication] = await Promise.all([
          this.prisma.usersOnGroups.findUnique({
            where: {
              userId_groupId: {
                userId: existingUser.id,
                groupId,
              },
            },
          }),
          this.prisma.groupApplication.findUnique({
            where: {
              userId_groupId: {
                userId: existingUser.id,
                groupId,
              },
            },
          }),
        ]);
        if (existingMembership) {
          throw new ConflictException('This user is already a member of this group');
        }
        if (existingApplication) {
          throw new ConflictException('User already has an open application for this group');
        }
      }
    }

    const [inviteByEmail, inviteByUser] = await Promise.all([
      this.prisma.groupInvite.findFirst({
        where: {
          groupId,
          invitedEmail: targetEmail,
        },
        select: { id: true },
      }),
      targetUserId
        ? this.prisma.groupInvite.findFirst({
            where: {
              groupId,
              invitedUserId: targetUserId,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (inviteByEmail || inviteByUser) {
      throw new ConflictException('An invite for this user is already pending');
    }
  }
}

