import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsMembershipService } from './groups-membership.service';
import { EventsService } from '../events/events.service';

const MAX_SEASON_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

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

    const requestedSeasonStart = this.parseUtcDate(
      updateGroupDto.activeSeasonStartedAt,
    );
    const requestedSeasonEnd = this.parseUtcDate(updateGroupDto.activeSeasonEndsAt);

    if (
      currentGroup.activeSeasonStartedAt &&
      requestedSeasonStart &&
      !this.isSameUtcDate(currentGroup.activeSeasonStartedAt, requestedSeasonStart)
    ) {
      throw new BadRequestException('Active season start cannot be modified');
    }

    let effectiveSeasonStart = requestedSeasonStart ?? currentGroup.activeSeasonStartedAt ?? null;
    const effectiveSeasonEnd = requestedSeasonEnd ?? currentGroup.activeSeasonEndsAt ?? null;

    if (requestedSeasonEnd && !effectiveSeasonStart) {
      effectiveSeasonStart = this.toUtcDay(new Date());
    }

    if (effectiveSeasonStart && effectiveSeasonEnd) {
      this.validateSeasonWindow(effectiveSeasonStart, effectiveSeasonEnd, 'Season');
    }

    const nextFieldsTouched =
      updateGroupDto.nextSeasonName !== undefined ||
      updateGroupDto.nextSeasonStartsAt !== undefined ||
      updateGroupDto.nextSeasonEndsAt !== undefined ||
      updateGroupDto.nextSeasonIsSuccessive !== undefined ||
      updateGroupDto.nextSeasonInterval !== undefined ||
      updateGroupDto.nextSeasonIntermissionDays !== undefined;

    const effectiveNextSeasonName =
      updateGroupDto.nextSeasonName !== undefined
        ? this.normalizeSeasonName(updateGroupDto.nextSeasonName)
        : currentGroup.nextSeasonName;
    const effectiveNextSeasonStart =
      updateGroupDto.nextSeasonStartsAt !== undefined
        ? this.parseUtcDate(updateGroupDto.nextSeasonStartsAt)
        : currentGroup.nextSeasonStartsAt;
    const effectiveNextSeasonEnd =
      updateGroupDto.nextSeasonEndsAt !== undefined
        ? this.parseUtcDate(updateGroupDto.nextSeasonEndsAt)
        : currentGroup.nextSeasonEndsAt;
    const effectiveNextSeasonSuccessive =
      updateGroupDto.nextSeasonIsSuccessive ?? currentGroup.nextSeasonIsSuccessive;
    const effectiveNextSeasonInterval =
      updateGroupDto.nextSeasonInterval ?? currentGroup.nextSeasonInterval;
    const effectiveNextSeasonIntermission =
      updateGroupDto.nextSeasonIntermissionDays ?? currentGroup.nextSeasonIntermissionDays;
    const effectiveSeasonPauseDays =
      updateGroupDto.seasonPauseDays ?? currentGroup.seasonPauseDays ?? 0;

    if (nextFieldsTouched) {
      const hasMeaningfulNextData =
        !!effectiveNextSeasonName ||
        !!effectiveNextSeasonStart ||
        !!effectiveNextSeasonEnd ||
        effectiveNextSeasonSuccessive;

      if (hasMeaningfulNextData && !effectiveNextSeasonStart) {
        throw new BadRequestException('Next season start date is required');
      }

      if (effectiveNextSeasonStart && effectiveNextSeasonEnd) {
        this.validateSeasonWindow(
          effectiveNextSeasonStart,
          effectiveNextSeasonEnd,
          'Next season',
        );
      }

      if (effectiveNextSeasonStart && effectiveSeasonEnd) {
        const minFromActiveSeason = this.addDaysUtc(
          effectiveSeasonEnd,
          effectiveSeasonPauseDays,
        );
        if (effectiveNextSeasonStart.getTime() < minFromActiveSeason.getTime()) {
          throw new BadRequestException(
            'Next season start must be on or after active season end plus pause days',
          );
        }
      }

      const todayUtc = this.toUtcDay(new Date());
      if (effectiveNextSeasonStart && effectiveNextSeasonStart.getTime() < todayUtc.getTime()) {
        throw new BadRequestException('Next season start cannot be in the past');
      }

      const pauseUntilUtc = currentGroup.seasonPauseUntil
        ? this.toUtcDay(currentGroup.seasonPauseUntil)
        : null;
      if (
        effectiveNextSeasonStart &&
        pauseUntilUtc &&
        effectiveNextSeasonStart.getTime() < pauseUntilUtc.getTime()
      ) {
        throw new BadRequestException(
          'Next season start must be on or after the active season pause end',
        );
      }

      if (effectiveNextSeasonSuccessive && !effectiveNextSeasonInterval) {
        throw new BadRequestException(
          'Interval is required when successive schedule is enabled',
        );
      }
    }

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        name: updateGroupDto.name,
        description: updateGroupDto.description,
        historyRetentionDays: updateGroupDto.historyRetentionDays,
        activeSeasonName:
          updateGroupDto.activeSeasonName !== undefined
            ? this.normalizeSeasonName(updateGroupDto.activeSeasonName)
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

    if (!this.isSameNullableUtcDate(currentGroup.activeSeasonEndsAt, group.activeSeasonEndsAt)) {
      const message = group.activeSeasonEndsAt
        ? `Active season end updated to ${this.toUtcDateLabel(group.activeSeasonEndsAt)} (UTC).`
        : 'Active season end was cleared.';
      await this.eventsService.log(groupId, 'SEASON_UPDATED', message);
    }

    return group;
  }

  private normalizeSeasonName(name?: string | null): string | null {
    const trimmed = name?.trim();
    return trimmed ? trimmed : null;
  }

  private parseUtcDate(value?: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }
    return this.toUtcDay(parsed);
  }

  private validateSeasonWindow(start: Date, end: Date, label: string): void {
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException(`${label} end must be after start`);
    }
    if (end.getTime() - start.getTime() > MAX_SEASON_DURATION_MS) {
      throw new BadRequestException(`${label} length cannot exceed 1 year`);
    }
  }

  private toUtcDay(date: Date): Date {
    const utc = new Date(date);
    utc.setUTCHours(0, 0, 0, 0);
    return utc;
  }

  private addDaysUtc(date: Date, days: number): Date {
    const base = this.toUtcDay(date);
    const safeDays = Math.max(0, days || 0);
    return new Date(base.getTime() + safeDays * 24 * 60 * 60 * 1000);
  }

  private isSameUtcDate(a: Date, b: Date): boolean {
    return this.toUtcDay(a).getTime() === this.toUtcDay(b).getTime();
  }

  private isSameNullableUtcDate(a: Date | null, b: Date | null): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return this.isSameUtcDate(a, b);
  }

  private toUtcDateLabel(date: Date): string {
    return this.toUtcDay(date).toISOString().slice(0, 10);
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
