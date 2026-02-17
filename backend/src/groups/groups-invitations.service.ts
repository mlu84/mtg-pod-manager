import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupInviteType, Prisma, SystemRole } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { GroupsMembershipService } from './groups-membership.service';

@Injectable()
export class GroupsInvitationsService {
  constructor(
    private prisma: PrismaService,
    private membershipService: GroupsMembershipService,
    private eventsService: EventsService,
    private mailService: MailService,
  ) {}

  async searchInvitableUsers(groupId: string, adminUserId: string, query: string) {
    await this.membershipService.ensureAdmin(groupId, adminUserId);

    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        inAppName: { contains: trimmed },
        id: { not: adminUserId },
        systemRole: SystemRole.USER,
      },
      select: {
        id: true,
        inAppName: true,
        email: true,
      },
      orderBy: { inAppName: 'asc' },
      take: 20,
    });

    if (users.length === 0) {
      return [];
    }

    const userIds = users.map((user) => user.id);
    const emails = users.map((user) => this.normalizeEmail(user.email));

    const [memberships, applications, invitesByUser, invitesByEmail] = await Promise.all([
      this.prisma.usersOnGroups.findMany({
        where: {
          groupId,
          userId: { in: userIds },
        },
        select: { userId: true },
      }),
      this.prisma.groupApplication.findMany({
        where: {
          groupId,
          userId: { in: userIds },
        },
        select: { userId: true },
      }),
      this.prisma.groupInvite.findMany({
        where: {
          groupId,
          invitedUserId: { in: userIds },
        },
        select: { invitedUserId: true },
      }),
      this.prisma.groupInvite.findMany({
        where: {
          groupId,
          invitedEmail: { in: emails },
        },
        select: { invitedEmail: true },
      }),
    ]);

    const memberIds = new Set(memberships.map((entry) => entry.userId));
    const applicantIds = new Set(applications.map((entry) => entry.userId));
    const invitedUserIds = new Set(
      invitesByUser
        .map((entry) => entry.invitedUserId)
        .filter((value): value is string => !!value),
    );
    const invitedEmails = new Set(invitesByEmail.map((entry) => this.normalizeEmail(entry.invitedEmail)));

    return users
      .filter((user) => {
        if (memberIds.has(user.id)) return false;
        if (applicantIds.has(user.id)) return false;
        if (invitedUserIds.has(user.id)) return false;
        if (invitedEmails.has(this.normalizeEmail(user.email))) return false;
        return true;
      })
      .map((user) => ({
        id: user.id,
        inAppName: user.inAppName,
      }));
  }

  async createUserInvite(groupId: string, adminUserId: string, targetUserId: string) {
    await this.membershipService.ensureAdmin(groupId, adminUserId);

    if (targetUserId === adminUserId) {
      throw new ConflictException('You cannot invite yourself');
    }

    const [group, targetUser] = await Promise.all([
      this.prisma.group.findUnique({
        where: { id: groupId },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          inAppName: true,
          systemRole: true,
        },
      }),
    ]);

    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    if (targetUser.systemRole === SystemRole.SYSADMIN) {
      throw new ConflictException('This user cannot be invited');
    }

    await this.ensureInvitable(groupId, targetUser.id, this.normalizeEmail(targetUser.email));

    try {
      await this.prisma.groupInvite.create({
        data: {
          groupId,
          inviterUserId: adminUserId,
          invitedUserId: targetUser.id,
          invitedEmail: this.normalizeEmail(targetUser.email),
          type: GroupInviteType.USER,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An invite for this user is already pending');
      }
      throw error;
    }

    return { message: `${targetUser.inAppName} was invited.` };
  }

  async createEmailInvite(groupId: string, adminUserId: string, email: string) {
    await this.membershipService.ensureAdmin(groupId, adminUserId);

    const normalizedEmail = this.normalizeEmail(email);
    const [group, inviter, existingUser] = await Promise.all([
      this.prisma.group.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          name: true,
          inviteCode: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: {
          id: true,
          email: true,
          inAppName: true,
        },
      }),
      this.prisma.user.findFirst({
        where: { email: normalizedEmail },
        select: {
          id: true,
          inAppName: true,
          email: true,
          systemRole: true,
        },
      }),
    ]);

    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    if (this.normalizeEmail(inviter.email) === normalizedEmail) {
      throw new ConflictException('You cannot invite yourself');
    }

    if (existingUser?.systemRole === SystemRole.SYSADMIN) {
      throw new ConflictException('This user cannot be invited');
    }

    await this.ensureInvitable(groupId, existingUser?.id ?? null, normalizedEmail);

    let invite: { id: string };
    try {
      invite = await this.prisma.groupInvite.create({
        data: {
          groupId,
          inviterUserId: adminUserId,
          invitedUserId: existingUser?.id ?? null,
          invitedEmail: normalizedEmail,
          type: GroupInviteType.EMAIL,
        },
        select: { id: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An invite for this email is already pending');
      }
      throw error;
    }

    try {
      await this.mailService.sendGroupInviteEmail({
        to: normalizedEmail,
        inviterName: inviter.inAppName,
        groupName: group.name,
        inviteCode: group.inviteCode,
      });
    } catch {
      await this.prisma.groupInvite.delete({ where: { id: invite.id } });
      throw new BadRequestException('Failed to send invitation email');
    }

    return { message: `Invitation sent to ${normalizedEmail}.` };
  }

  async getIncomingInvites(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return [];
    }

    const normalizedEmail = this.normalizeEmail(user.email);
    const invites = await this.prisma.groupInvite.findMany({
      where: {
        OR: [
          { invitedUserId: user.id },
          { invitedEmail: normalizedEmail },
        ],
        group: {
          members: {
            none: { userId: user.id },
          },
        },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            format: true,
          },
        },
        inviter: {
          select: {
            id: true,
            inAppName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((invite) => ({
      id: invite.id,
      createdAt: invite.createdAt,
      type: invite.type,
      invitedEmail: invite.invitedEmail,
      group: invite.group,
      inviter: invite.inviter,
    }));
  }

  async acceptInvite(inviteId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        inAppName: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const invite = await this.prisma.groupInvite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        groupId: true,
        invitedUserId: true,
        invitedEmail: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    this.ensureInviteReceiver(invite, userId, user.email);

    const existingMembership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: invite.groupId,
        },
      },
    });

    if (existingMembership) {
      await this.prisma.groupInvite.delete({ where: { id: invite.id } });
      return { message: 'You are already a member of this group', groupId: invite.groupId };
    }

    const normalizedEmail = this.normalizeEmail(user.email);
    await this.prisma.$transaction(async (tx) => {
      await tx.usersOnGroups.create({
        data: {
          userId,
          groupId: invite.groupId,
          role: 'MEMBER',
        },
      });

      await tx.groupApplication.deleteMany({
        where: {
          userId,
          groupId: invite.groupId,
        },
      });

      await tx.groupInvite.deleteMany({
        where: {
          groupId: invite.groupId,
          OR: [
            { invitedUserId: userId },
            { invitedEmail: normalizedEmail },
          ],
        },
      });
    });

    await this.eventsService.log(
      invite.groupId,
      'INVITE_ACCEPTED',
      `${user.inAppName} accepted an invite and joined the group`,
    );

    return { message: 'Invite accepted', groupId: invite.groupId };
  }

  async rejectInvite(inviteId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        inAppName: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const invite = await this.prisma.groupInvite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        groupId: true,
        invitedUserId: true,
        invitedEmail: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    this.ensureInviteReceiver(invite, userId, user.email);

    await this.prisma.groupInvite.delete({
      where: { id: invite.id },
    });

    await this.eventsService.log(
      invite.groupId,
      'INVITE_REJECTED',
      `${user.inAppName} rejected an invite`,
    );

    return { message: 'Invite rejected' };
  }

  async getSentInvites(userId: string) {
    const invites = await this.prisma.groupInvite.findMany({
      where: {
        inviterUserId: userId,
        group: {
          members: {
            some: {
              userId,
              role: 'ADMIN',
            },
          },
        },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            format: true,
          },
        },
        invitedUser: {
          select: {
            id: true,
            inAppName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((invite) => ({
      id: invite.id,
      createdAt: invite.createdAt,
      type: invite.type,
      invitedEmail: invite.invitedEmail,
      invitedUser: invite.invitedUser,
      group: invite.group,
    }));
  }

  async cancelSentInvite(inviteId: string, userId: string) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        groupId: true,
        inviterUserId: true,
        invitedUser: {
          select: { inAppName: true },
        },
        invitedEmail: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.inviterUserId !== userId) {
      throw new ForbiddenException('You can only cancel your own invites');
    }

    await this.membershipService.ensureAdmin(
      invite.groupId,
      userId,
      'Only group admins can cancel invites',
    );

    await this.prisma.groupInvite.delete({
      where: { id: inviteId },
    });

    const targetLabel = invite.invitedUser?.inAppName || invite.invitedEmail;
    await this.eventsService.log(
      invite.groupId,
      'INVITE_CANCELED',
      `Invite for ${targetLabel} was canceled`,
    );

    return { message: 'Invite canceled' };
  }

  private normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  private async ensureInvitable(groupId: string, targetUserId: string | null, targetEmail: string) {
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

  private ensureInviteReceiver(
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
}
