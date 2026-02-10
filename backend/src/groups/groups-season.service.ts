import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { GroupsMembershipService } from './groups-membership.service';

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
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        activeSeasonEndsAt: true,
        activeSeasonStartedAt: true,
        activeSeasonName: true,
        seasonPauseDays: true,
        seasonPauseUntil: true,
      },
    });

    if (!group?.activeSeasonEndsAt || !group.activeSeasonStartedAt) {
      return;
    }

    const now = new Date();
    if (now < group.activeSeasonEndsAt) {
      return;
    }

    const snapshot = await this.createSeasonSnapshot(
      groupId,
      group.activeSeasonStartedAt,
      group.activeSeasonEndsAt,
      group.activeSeasonName,
    );

    const durationMs = Math.max(
      group.activeSeasonEndsAt.getTime() - group.activeSeasonStartedAt.getTime(),
      24 * 60 * 60 * 1000,
    );
    // Guard against invalid or zero-length seasons.
    const pauseDays = group.seasonPauseDays ?? 0;
    const pauseUntil =
      pauseDays > 0 ? new Date(now.getTime() + pauseDays * 24 * 60 * 60 * 1000) : null;
    // Optional pause creates a gap between seasons without changing duration.
    const newStart = pauseUntil ?? new Date();
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
      'SEASON_RESET',
      'Season was reset',
    );
  }

  /**
   * Manually reset the season (admin only), using "now" as the end date.
   * The next season keeps the same duration as the original configuration.
   */
  async resetSeason(groupId: string, userId: string): Promise<void> {
    await this.membershipService.ensureAdmin(groupId, userId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        activeSeasonEndsAt: true,
        activeSeasonStartedAt: true,
        activeSeasonName: true,
        seasonPauseDays: true,
      },
    });

    if (!group?.activeSeasonStartedAt || !group.activeSeasonEndsAt) {
      throw new BadRequestException('Season is not configured');
    }

    const now = new Date();
    const snapshot = await this.createSeasonSnapshot(
      groupId,
      group.activeSeasonStartedAt,
      now,
      group.activeSeasonName,
    );

    const durationMs = Math.max(
      group.activeSeasonEndsAt.getTime() - group.activeSeasonStartedAt.getTime(),
      24 * 60 * 60 * 1000,
    );
    // Guard against invalid or zero-length seasons.
    const pauseDays = group.seasonPauseDays ?? 0;
    const pauseUntil =
      pauseDays > 0 ? new Date(now.getTime() + pauseDays * 24 * 60 * 60 * 1000) : null;
    // Optional pause creates a gap between seasons without changing duration.
    const newStart = pauseUntil ?? new Date();
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
      'SEASON_RESET',
      'Season was reset manually',
    );
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
