import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { GroupsMembershipService } from './groups-membership.service';

@Injectable()
export class GroupsApplicationsService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private membershipService: GroupsMembershipService,
  ) {}

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
    await this.membershipService.ensureAdmin(groupId, userId);

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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
        return [];
      }
      throw error;
    }
  }

  async acceptApplication(
    groupId: string,
    applicantUserId: string,
    adminUserId: string,
  ) {
    await this.membershipService.ensureAdmin(groupId, adminUserId);

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
      `${application.user.inAppName} was accepted into the group`,
    );

    return { message: 'Application accepted' };
  }

  async rejectApplication(
    groupId: string,
    applicantUserId: string,
    adminUserId: string,
  ) {
    await this.membershipService.ensureAdmin(groupId, adminUserId);

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
      `${application.user.inAppName} was rejected`,
    );

    return { message: 'Application rejected' };
  }
}
