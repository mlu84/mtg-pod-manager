import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { GroupsMembershipService } from './groups-membership.service';
import { SeasonInterval } from '@prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;

type GroupSeasonState = {
  id: string;
  activeSeasonEndsAt: Date | null;
  activeSeasonStartedAt: Date | null;
  activeSeasonName: string | null;
  nextSeasonName: string | null;
  nextSeasonStartsAt: Date | null;
  nextSeasonEndsAt: Date | null;
  nextSeasonIsSuccessive: boolean;
  nextSeasonInterval: SeasonInterval | null;
  nextSeasonIntermissionDays: number;
  seasonPauseDays: number;
  seasonPauseUntil: Date | null;
};

@Injectable()
export class GroupsSeasonService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private membershipService: GroupsMembershipService,
  ) {}

  /**
   * Auto-rolls the season forward once the end date has passed.
   * Creates a snapshot of the finished season and resets deck stats for the new one.
   */
  async ensureSeasonUpToDate(groupId: string): Promise<void> {
    const group = await this.getSeasonState(groupId);
    if (!group) return;

    const now = new Date();
    if (!group.activeSeasonEndsAt || !group.activeSeasonStartedAt) {
      await this.activatePlannedNextSeasonIfDue(groupId, group, now);
      return;
    }

    if (
      group.seasonPauseUntil &&
      now >= group.seasonPauseUntil &&
      group.activeSeasonStartedAt <= group.seasonPauseUntil
    ) {
      await this.prisma.group.update({
        where: { id: groupId },
        data: { seasonPauseUntil: null },
      });
      const startedSeasonLabel = this.getSeasonLabel(group.activeSeasonName);
      await this.eventsService.log(
        groupId,
        'SEASON_STARTED',
        `${startedSeasonLabel} has started`,
      );
      group.seasonPauseUntil = null;
    }

    if (now < group.activeSeasonEndsAt) {
      return;
    }

    await this.completeSeason(
      groupId,
      group.activeSeasonEndsAt,
      group,
      { requireSameDayNextSeason: false },
    );
  }

  /**
   * Manually reset the season (admin only), using "now" as the end date.
   * The next season keeps the same duration as the original configuration.
   */
  async resetSeason(groupId: string, userId: string): Promise<void> {
    await this.membershipService.ensureAdmin(groupId, userId);

    const group = await this.getSeasonState(groupId);

    if (!group) {
      throw new BadRequestException('Season is not configured');
    }

    const now = new Date();
    const hasActiveSeasonData = this.hasActiveSeasonData(group);
    const hasNextSeasonData = this.hasNextSeasonData(group);
    const isPauseActive = !!group.seasonPauseUntil && now < group.seasonPauseUntil;

    if (!hasActiveSeasonData && isPauseActive && hasNextSeasonData) {
      await this.clearPauseAndNextSeason(groupId);
      await this.eventsService.log(
        groupId,
        'SEASON_UPDATED',
        'Season pause and planned next season were removed.',
      );
      return;
    }

    if (!hasActiveSeasonData && !hasNextSeasonData) {
      throw new BadRequestException('Season is not configured');
    }

    if (!hasActiveSeasonData && hasNextSeasonData) {
      await this.clearPauseAndNextSeason(groupId);
      await this.eventsService.log(
        groupId,
        'SEASON_UPDATED',
        'Planned next season was removed.',
      );
      return;
    }

    if (!group.activeSeasonStartedAt) {
      throw new BadRequestException('Season is not configured');
    }

    const activeSeasonStarted = group.activeSeasonStartedAt.getTime() <= now.getTime();
    let snapshotId: string | null = null;

    if (activeSeasonStarted) {
      const snapshot = await this.createSeasonSnapshot(
        groupId,
        group.activeSeasonStartedAt,
        now,
        group.activeSeasonName,
      );
      snapshotId = snapshot.id;
      const seasonLabel = this.getSeasonLabel(group.activeSeasonName);
      await this.eventsService.log(
        groupId,
        'SEASON_ENDED',
        `${seasonLabel} has ended`,
      );
    }

    if (
      hasNextSeasonData &&
      group.nextSeasonStartsAt &&
      this.isSameUtcDay(group.nextSeasonStartsAt, now)
    ) {
      const nextSeason = this.resolveNextSeasonStart(group, now, {
        requireSameDayNextSeason: true,
      });
      if (nextSeason) {
        const data: {
          lastSeasonId?: string;
          activeSeasonName: string | null;
          activeSeasonStartedAt: Date;
          activeSeasonEndsAt: Date | null;
          seasonPauseUntil: Date | null;
          nextSeasonName: string | null;
          nextSeasonStartsAt: Date | null;
          nextSeasonEndsAt: Date | null;
          nextSeasonIsSuccessive: boolean;
          nextSeasonInterval: SeasonInterval | null;
          nextSeasonIntermissionDays: number;
        } = {
          activeSeasonName: nextSeason.activeSeasonName,
          activeSeasonStartedAt: nextSeason.activeSeasonStartedAt,
          activeSeasonEndsAt: nextSeason.activeSeasonEndsAt,
          seasonPauseUntil: nextSeason.seasonPauseUntil,
          nextSeasonName: nextSeason.nextSeasonName,
          nextSeasonStartsAt: nextSeason.nextSeasonStartsAt,
          nextSeasonEndsAt: nextSeason.nextSeasonEndsAt,
          nextSeasonIsSuccessive: nextSeason.nextSeasonIsSuccessive,
          nextSeasonInterval: nextSeason.nextSeasonInterval,
          nextSeasonIntermissionDays: nextSeason.nextSeasonIntermissionDays,
        };
        if (snapshotId) {
          data.lastSeasonId = snapshotId;
        }
        await this.prisma.group.update({
          where: { id: groupId },
          data,
        });

        if (!nextSeason.seasonPauseUntil) {
          const nextSeasonLabel = this.getSeasonLabel(nextSeason.activeSeasonName);
          await this.eventsService.log(
            groupId,
            'SEASON_STARTED',
            `${nextSeasonLabel} has started`,
          );
        }
        return;
      }
    }

    const pauseUntil =
      hasNextSeasonData && group.nextSeasonStartsAt && group.nextSeasonStartsAt > now
        ? group.nextSeasonStartsAt
        : null;
    const clearActiveData: {
      lastSeasonId?: string;
      activeSeasonName: null;
      activeSeasonStartedAt: null;
      activeSeasonEndsAt: null;
      seasonPauseUntil: Date | null;
    } = {
      activeSeasonName: null,
      activeSeasonStartedAt: null,
      activeSeasonEndsAt: null,
      seasonPauseUntil: pauseUntil,
    };
    if (snapshotId) {
      clearActiveData.lastSeasonId = snapshotId;
    }
    await this.prisma.group.update({
      where: { id: groupId },
      data: clearActiveData,
    });
  }

  private async completeSeason(
    groupId: string,
    endedAt: Date,
    group: GroupSeasonState,
    options: { requireSameDayNextSeason: boolean },
  ): Promise<void> {
    if (!group.activeSeasonStartedAt || !group.activeSeasonEndsAt) {
      throw new BadRequestException('Season is not configured');
    }

    if (endedAt.getTime() <= group.activeSeasonStartedAt.getTime()) {
      throw new BadRequestException('Season cannot end before it starts');
    }

    const snapshot = await this.createSeasonSnapshot(
      groupId,
      group.activeSeasonStartedAt,
      endedAt,
      group.activeSeasonName,
    );

    const nextSeason = this.resolveNextSeasonStart(group, endedAt, options);
    const seasonLabel = this.getSeasonLabel(group.activeSeasonName);
    await this.eventsService.log(
      groupId,
      'SEASON_ENDED',
      `${seasonLabel} has ended`,
    );

    if (nextSeason) {
      await this.prisma.group.update({
        where: { id: groupId },
        data: {
          lastSeasonId: snapshot.id,
          activeSeasonName: nextSeason.activeSeasonName,
          activeSeasonStartedAt: nextSeason.activeSeasonStartedAt,
          activeSeasonEndsAt: nextSeason.activeSeasonEndsAt,
          seasonPauseUntil: nextSeason.seasonPauseUntil,
          nextSeasonName: nextSeason.nextSeasonName,
          nextSeasonStartsAt: nextSeason.nextSeasonStartsAt,
          nextSeasonEndsAt: nextSeason.nextSeasonEndsAt,
          nextSeasonIsSuccessive: nextSeason.nextSeasonIsSuccessive,
          nextSeasonInterval: nextSeason.nextSeasonInterval,
          nextSeasonIntermissionDays: nextSeason.nextSeasonIntermissionDays,
        },
      });

      if (!nextSeason.seasonPauseUntil) {
        const nextSeasonLabel = this.getSeasonLabel(nextSeason.activeSeasonName);
        await this.eventsService.log(
          groupId,
          'SEASON_STARTED',
          `${nextSeasonLabel} has started`,
        );
      }
      return;
    }

    const durationMs = Math.max(
      group.activeSeasonEndsAt.getTime() - group.activeSeasonStartedAt.getTime(),
      DAY_MS,
    );
    const pauseDays = group.seasonPauseDays ?? 0;
    const transitionBase = new Date();
    const pauseUntil =
      pauseDays > 0 ? new Date(transitionBase.getTime() + pauseDays * DAY_MS) : null;
    const newStart = pauseUntil ?? transitionBase;
    const newEnd = new Date(newStart.getTime() + durationMs);

    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        lastSeasonId: snapshot.id,
        activeSeasonName: null,
        activeSeasonStartedAt: newStart,
        activeSeasonEndsAt: newEnd,
        seasonPauseUntil: pauseUntil,
      },
    });

    await this.eventsService.log(
      groupId,
      'SEASON_STARTED',
      `${seasonLabel} has started`,
    );
  }

  private getSeasonLabel(name?: string | null): string {
    const trimmed = name?.trim();
    if (!trimmed) return 'Season';
    return trimmed.toLowerCase().startsWith('season ')
      ? trimmed
      : `Season ${trimmed}`;
  }

  private async getSeasonState(groupId: string): Promise<GroupSeasonState | null> {
    return this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        activeSeasonEndsAt: true,
        activeSeasonStartedAt: true,
        activeSeasonName: true,
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
  }

  private hasActiveSeasonData(group: GroupSeasonState): boolean {
    return !!group.activeSeasonName || !!group.activeSeasonStartedAt || !!group.activeSeasonEndsAt;
  }

  private hasNextSeasonData(group: GroupSeasonState): boolean {
    return (
      !!group.nextSeasonName ||
      !!group.nextSeasonStartsAt ||
      !!group.nextSeasonEndsAt ||
      group.nextSeasonIsSuccessive ||
      !!group.nextSeasonInterval ||
      group.nextSeasonIntermissionDays > 0
    );
  }

  private async clearPauseAndNextSeason(groupId: string): Promise<void> {
    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        seasonPauseUntil: null,
        nextSeasonName: null,
        nextSeasonStartsAt: null,
        nextSeasonEndsAt: null,
        nextSeasonIsSuccessive: false,
        nextSeasonInterval: null,
        nextSeasonIntermissionDays: 0,
      },
    });
  }

  private async activatePlannedNextSeasonIfDue(
    groupId: string,
    group: GroupSeasonState,
    now: Date,
  ): Promise<void> {
    if (!group.nextSeasonStartsAt || now < group.nextSeasonStartsAt) {
      return;
    }

    const plannedStart = new Date(group.nextSeasonStartsAt);
    const plannedEnd =
      group.nextSeasonEndsAt
        ? new Date(group.nextSeasonEndsAt)
        : group.nextSeasonIsSuccessive && group.nextSeasonInterval
          ? this.addInterval(plannedStart, group.nextSeasonInterval)
          : null;

    const nextPlan = this.buildFollowingNextSeasonPlan(group, plannedStart, plannedEnd);

    await this.prisma.group.update({
      where: { id: groupId },
      data: {
        activeSeasonName: group.nextSeasonName,
        activeSeasonStartedAt: plannedStart,
        activeSeasonEndsAt: plannedEnd,
        seasonPauseUntil: null,
        nextSeasonName: nextPlan?.name ?? null,
        nextSeasonStartsAt: nextPlan?.startsAt ?? null,
        nextSeasonEndsAt: nextPlan?.endsAt ?? null,
        nextSeasonIsSuccessive: nextPlan?.isSuccessive ?? false,
        nextSeasonInterval: nextPlan?.interval ?? null,
        nextSeasonIntermissionDays: nextPlan?.intermissionDays ?? 0,
      },
    });

    const seasonLabel = this.getSeasonLabel(group.nextSeasonName);
    await this.eventsService.log(
      groupId,
      'SEASON_STARTED',
      `${seasonLabel} has started`,
    );
  }

  private resolveNextSeasonStart(
    group: GroupSeasonState,
    endedAt: Date,
    options: { requireSameDayNextSeason: boolean },
  ): {
    activeSeasonName: string | null;
    activeSeasonStartedAt: Date;
    activeSeasonEndsAt: Date | null;
    seasonPauseUntil: Date | null;
    nextSeasonName: string | null;
    nextSeasonStartsAt: Date | null;
    nextSeasonEndsAt: Date | null;
    nextSeasonIsSuccessive: boolean;
    nextSeasonInterval: SeasonInterval | null;
    nextSeasonIntermissionDays: number;
  } | null {
    if (!group.nextSeasonStartsAt) {
      return null;
    }

    if (
      options.requireSameDayNextSeason &&
      !this.isSameUtcDay(group.nextSeasonStartsAt, endedAt)
    ) {
      return null;
    }

    const plannedStart = new Date(group.nextSeasonStartsAt);
    const plannedEnd =
      group.nextSeasonEndsAt
        ? new Date(group.nextSeasonEndsAt)
        : group.nextSeasonIsSuccessive && group.nextSeasonInterval
          ? this.addInterval(plannedStart, group.nextSeasonInterval)
          : null;
    const seasonPauseUntil = plannedStart.getTime() > endedAt.getTime() ? plannedStart : null;

    const nextPlan = this.buildFollowingNextSeasonPlan(
      group,
      plannedStart,
      plannedEnd,
    );

    return {
      activeSeasonName: group.nextSeasonName,
      activeSeasonStartedAt: plannedStart,
      activeSeasonEndsAt: plannedEnd,
      seasonPauseUntil,
      nextSeasonName: nextPlan?.name ?? null,
      nextSeasonStartsAt: nextPlan?.startsAt ?? null,
      nextSeasonEndsAt: nextPlan?.endsAt ?? null,
      nextSeasonIsSuccessive: nextPlan?.isSuccessive ?? false,
      nextSeasonInterval: nextPlan?.interval ?? null,
      nextSeasonIntermissionDays: nextPlan?.intermissionDays ?? 0,
    };
  }

  private buildFollowingNextSeasonPlan(
    group: GroupSeasonState,
    activeSeasonStart: Date,
    activeSeasonEnd: Date | null,
  ): {
    name: string | null;
    startsAt: Date;
    endsAt: Date | null;
    isSuccessive: boolean;
    interval: SeasonInterval;
    intermissionDays: number;
  } | null {
    if (!group.nextSeasonIsSuccessive || !group.nextSeasonInterval) {
      return null;
    }

    const intermissionDays = group.nextSeasonIntermissionDays ?? 0;
    const interval = group.nextSeasonInterval;
    const baseStart = activeSeasonEnd
      ? this.addDaysUtc(activeSeasonEnd, intermissionDays)
      : this.addDaysUtc(this.addInterval(activeSeasonStart, interval), intermissionDays);

    return {
      name: group.nextSeasonName,
      startsAt: baseStart,
      endsAt: this.addInterval(baseStart, interval),
      isSuccessive: true,
      interval,
      intermissionDays,
    };
  }

  private addDaysUtc(date: Date, days: number): Date {
    const base = this.toUtcDay(date);
    return new Date(base.getTime() + Math.max(0, days) * DAY_MS);
  }

  private addInterval(date: Date, interval: SeasonInterval): Date {
    const base = this.toUtcDay(date);
    if (interval === 'WEEKLY') {
      return this.addDaysUtc(base, 7);
    }
    if (interval === 'BI_WEEKLY') {
      return this.addDaysUtc(base, 14);
    }

    const shifted = new Date(base);
    if (interval === 'MONTHLY') shifted.setUTCMonth(shifted.getUTCMonth() + 1);
    if (interval === 'QUARTERLY') shifted.setUTCMonth(shifted.getUTCMonth() + 3);
    if (interval === 'HALF_YEARLY') shifted.setUTCMonth(shifted.getUTCMonth() + 6);
    if (interval === 'YEARLY') shifted.setUTCFullYear(shifted.getUTCFullYear() + 1);
    shifted.setUTCHours(0, 0, 0, 0);
    return shifted;
  }

  private isSameUtcDay(a: Date, b: Date): boolean {
    return this.toUtcDay(a).getTime() === this.toUtcDay(b).getTime();
  }

  private toUtcDay(date: Date): Date {
    const utc = new Date(date);
    utc.setUTCHours(0, 0, 0, 0);
    return utc;
  }

  /**
   * Returns the last season's ranking snapshot, ordered by final position.
   */
  async getLastSeasonRanking(groupId: string): Promise<
    Array<{
      position: number;
      id: string | null;
      name: string;
      colors: string;
      type: null;
      owner: { id: string | null; inAppName: string };
      performanceRating: number;
      gamesPlayed: number;
      isActive: true;
    }>
  > {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        lastSeasonId: true,
      },
    });

    if (!group?.lastSeasonId) {
      return [];
    }

    const snapshot = await this.prisma.groupSeason.findUnique({
      where: { id: group.lastSeasonId },
      include: {
        decks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!snapshot) return [];

    return snapshot.decks.map((d) => ({
      position: d.position,
      id: d.deckId,
      name: d.deckName,
      colors: d.colors,
      type: null as null,
      owner: { id: d.deckId, inAppName: d.ownerName },
      performanceRating: d.performanceRating,
      gamesPlayed: d.gamesPlayed,
      isActive: true,
    }));
  }

  /**
   * Marks the winners banner as dismissed for a specific user.
   */
  async dismissWinnersBanner(groupId: string, userId: string): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { lastSeasonId: true },
    });
    if (!group?.lastSeasonId) return;

    await this.prisma.groupSeasonDismissal.upsert({
      where: {
        seasonId_userId: {
          seasonId: group.lastSeasonId,
          userId,
        },
      },
      update: {},
      create: {
        seasonId: group.lastSeasonId,
        userId,
      },
    });
  }

  /**
   * Returns the winners banner data when:
   * - a last season snapshot exists,
   * - it ended within the last 14 days,
   * - and the user has not dismissed it.
   */
  async getWinnersBanner(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { lastSeasonId: true },
    });

    if (!group?.lastSeasonId) return null;

    const snapshot = await this.prisma.groupSeason.findUnique({
      where: { id: group.lastSeasonId },
      include: {
        decks: {
          orderBy: { position: 'asc' },
          take: 3,
        },
        dismissals: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!snapshot) return null;

    // Only surface the banner briefly after season end to avoid stale highlights.
    const twoWeeks = 14 * 24 * 60 * 60 * 1000;
    if (new Date().getTime() - snapshot.endedAt.getTime() > twoWeeks) {
      return null;
    }

    // Respect per-user dismissal to avoid nagging banners.
    if (snapshot.dismissals.length > 0) {
      return null;
    }

    return {
      seasonId: snapshot.id,
      seasonName: snapshot.name || null,
      endedAt: snapshot.endedAt,
      winners: snapshot.decks.map((d) => ({
        position: d.position,
        deckName: d.deckName,
        ownerName: d.ownerName,
        colors: d.colors,
      })),
    };
  }

  /**
   * Persists a season snapshot and resets deck performance for the next season.
   */
  private async createSeasonSnapshot(
    groupId: string,
    startedAt: Date,
    endedAt: Date,
    name?: string | null,
  ) {
    const decks = await this.prisma.deck.findMany({
      where: { groupId },
      include: { owner: { select: { inAppName: true } } },
      orderBy: [
        { performanceRating: 'desc' },
        { gamesPlayed: 'desc' },
      ],
    });

    const snapshot = await this.prisma.groupSeason.create({
      data: {
        groupId,
        name: name || null,
        startedAt,
        endedAt,
        decks: {
          create: decks.map((deck, index) => ({
            deckId: deck.id,
            deckName: deck.name,
            colors: deck.colors,
            ownerName: deck.owner.inAppName,
            performanceRating: deck.performanceRating,
            gamesPlayed: deck.gamesPlayed,
            position: index + 1,
          })),
        },
      },
    });

    await this.prisma.deck.updateMany({
      where: { groupId },
      data: {
        performanceRating: 0,
        gamesPlayed: 0,
      },
    });

    return snapshot;
  }
}
