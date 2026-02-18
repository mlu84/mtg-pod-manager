import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsMembershipService } from './groups-membership.service';
import { EventsService } from '../events/events.service';
import { deleteGroupWithRelations } from '../common/prisma/group-delete.util';
import {
  isSameNullableUtcDate,
  normalizeSeasonName,
  toUtcDateLabel,
} from './groups-crud-season.util';
import { resolveSeasonUpdateState } from './groups-crud-season-update.util';

@Injectable()
export class GroupsCrudService {
  constructor(
    private prisma: PrismaService,
    private membershipService: GroupsMembershipService,
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

  async update(groupId: string, updateGroupDto: UpdateGroupDto, userId: string) {
    await this.membershipService.ensureAdmin(groupId, userId);

    const currentGroup = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        activeSeasonName: true,
        activeSeasonEndsAt: true,
        activeSeasonStartedAt: true,
        nextSeasonName: true,
        nextSeasonStartsAt: true,
        nextSeasonEndsAt: true,
        nextSeasonIsSuccessive: true,
        nextSeasonInterval: true,
        nextSeasonIntermissionDays: true,
        seasonPauseDays: true,
        seasonPauseUntil: true,
      },
    });

    if (!currentGroup) {
      throw new NotFoundException('Group not found');
    }

    const {
      effectiveSeasonStart,
      effectiveSeasonEnd,
      nextFieldsTouched,
      effectiveNextSeasonName,
      effectiveNextSeasonStart,
      effectiveNextSeasonEnd,
      effectiveNextSeasonSuccessive,
      effectiveNextSeasonInterval,
      effectiveNextSeasonIntermission,
    } = resolveSeasonUpdateState(currentGroup, updateGroupDto);

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        name: updateGroupDto.name,
        description: updateGroupDto.description,
        historyRetentionDays: updateGroupDto.historyRetentionDays,
        activeSeasonName:
          updateGroupDto.activeSeasonName !== undefined
            ? normalizeSeasonName(updateGroupDto.activeSeasonName)
            : undefined,
        activeSeasonEndsAt:
          updateGroupDto.activeSeasonEndsAt !== undefined ? effectiveSeasonEnd : undefined,
        activeSeasonStartedAt:
          updateGroupDto.activeSeasonStartedAt !== undefined ||
          (updateGroupDto.activeSeasonEndsAt !== undefined &&
            currentGroup.activeSeasonStartedAt === null &&
            !!effectiveSeasonStart)
            ? effectiveSeasonStart
            : undefined,
        nextSeasonName: nextFieldsTouched ? effectiveNextSeasonName : undefined,
        nextSeasonStartsAt: nextFieldsTouched ? effectiveNextSeasonStart : undefined,
        nextSeasonEndsAt: nextFieldsTouched ? effectiveNextSeasonEnd : undefined,
        nextSeasonIsSuccessive: nextFieldsTouched
          ? effectiveNextSeasonSuccessive
          : undefined,
        nextSeasonInterval: nextFieldsTouched
          ? effectiveNextSeasonSuccessive
            ? effectiveNextSeasonInterval
            : null
          : undefined,
        nextSeasonIntermissionDays: nextFieldsTouched
          ? effectiveNextSeasonSuccessive
            ? effectiveNextSeasonIntermission
            : 0
          : undefined,
        seasonPauseDays: updateGroupDto.seasonPauseDays,
      },
    });

    if (currentGroup.activeSeasonName !== group.activeSeasonName) {
      const message = group.activeSeasonName
        ? `Active season name updated to "${group.activeSeasonName}".`
        : 'Active season name was cleared.';
      await this.eventsService.log(groupId, 'SEASON_UPDATED', message);
    }

    if (!isSameNullableUtcDate(currentGroup.activeSeasonEndsAt, group.activeSeasonEndsAt)) {
      const message = group.activeSeasonEndsAt
        ? `Active season end updated to ${toUtcDateLabel(group.activeSeasonEndsAt)} (UTC).`
        : 'Active season end was cleared.';
      await this.eventsService.log(groupId, 'SEASON_UPDATED', message);
    }

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
      await deleteGroupWithRelations(tx, groupId);
    });

    return { message: 'Group deleted successfully' };
  }
}
