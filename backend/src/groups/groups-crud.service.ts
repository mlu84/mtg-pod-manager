import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsMembershipService } from './groups-membership.service';

@Injectable()
export class GroupsCrudService {
  constructor(
    private prisma: PrismaService,
    private membershipService: GroupsMembershipService,
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

  async update(groupId: string, updateGroupDto: UpdateGroupDto, userId: string) {
    await this.membershipService.ensureAdmin(groupId, userId);

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

  async remove(groupId: string, userId: string) {
    await this.membershipService.ensureAdmin(groupId, userId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.gamePlacement.deleteMany({
        where: {
          game: {
            groupId,
          },
        },
      });

      await tx.game.deleteMany({
        where: { groupId },
      });

      await tx.deck.deleteMany({
        where: { groupId },
      });

      await tx.groupEvent.deleteMany({
        where: { groupId },
      });

      await tx.groupApplication.deleteMany({
        where: { groupId },
      });

      await tx.usersOnGroups.deleteMany({
        where: { groupId },
      });

      await tx.group.delete({
        where: { id: groupId },
      });
    });

    return { message: 'Group deleted successfully' };
  }
}
