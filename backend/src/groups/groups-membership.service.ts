import { ForbiddenException, Injectable } from '@nestjs/common';
import { SystemRole, UsersOnGroups } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type GroupReadAccess = {
  role: 'ADMIN' | 'MEMBER';
  isSysadminReadonly: boolean;
  membership: UsersOnGroups | null;
};

@Injectable()
export class GroupsMembershipService {
  constructor(private prisma: PrismaService) {}

  async ensureCanReadGroup(
    userId: string,
    groupId: string,
  ): Promise<GroupReadAccess> {
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (membership) {
      return {
        role: membership.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
        isSysadminReadonly: false,
        membership,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { systemRole: true },
    });

    if (user?.systemRole === SystemRole.SYSADMIN) {
      return {
        role: 'MEMBER',
        isSysadminReadonly: true,
        membership: null,
      };
    }

    throw new ForbiddenException('You are not a member of this group');
  }

  async getMembershipOrThrow(
    userId: string,
    groupId: string,
  ): Promise<UsersOnGroups> {
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

    return membership;
  }

  ensureAdminMembership(
    membership: UsersOnGroups,
    forbiddenMessage = 'Only admins can perform this action',
  ): void {
    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException(forbiddenMessage);
    }
  }

  async ensureAdmin(
    groupId: string,
    userId: string,
    forbiddenMessage = 'Only admins can perform this action',
  ): Promise<UsersOnGroups> {
    const membership = await this.getMembershipOrThrow(userId, groupId);
    this.ensureAdminMembership(membership, forbiddenMessage);
    return membership;
  }
}
