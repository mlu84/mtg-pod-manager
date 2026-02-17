import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GroupsSeasonService } from './groups-season.service';
import { GroupsMembershipService } from './groups-membership.service';

const fixedNow = new Date('2026-02-10T12:00:00.000Z');

describe('GroupsSeasonService.ensureSeasonUpToDate', () => {
  const groupId = 'group-1';

  let prisma: {
    group: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let eventsService: { log: ReturnType<typeof vi.fn> };
  let membershipService: { ensureAdmin: ReturnType<typeof vi.fn> };
  let service: GroupsSeasonService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    prisma = {
      group: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    eventsService = {
      log: vi.fn(),
    };

    membershipService = {
      ensureAdmin: vi.fn().mockResolvedValue(undefined),
    };

    service = new GroupsSeasonService(
      prisma as any,
      eventsService as any,
      membershipService as unknown as GroupsMembershipService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns early when season is not configured', async () => {
    prisma.group.findUnique.mockResolvedValue({
      id: groupId,
      activeSeasonEndsAt: null,
      activeSeasonStartedAt: null,
      activeSeasonName: null,
      seasonPauseDays: null,
      seasonPauseUntil: null,
    });

    await service.ensureSeasonUpToDate(groupId);

    expect(prisma.group.update).not.toHaveBeenCalled();
    expect(eventsService.log).not.toHaveBeenCalled();
  });

  it('returns early when season end is in the future', async () => {
    prisma.group.findUnique.mockResolvedValue({
      id: groupId,
      activeSeasonEndsAt: new Date('2026-03-01T00:00:00.000Z'),
      activeSeasonStartedAt: new Date('2026-02-01T00:00:00.000Z'),
      activeSeasonName: 'Season A',
      seasonPauseDays: 0,
      seasonPauseUntil: null,
    });

    await service.ensureSeasonUpToDate(groupId);

    expect(prisma.group.update).not.toHaveBeenCalled();
    expect(eventsService.log).not.toHaveBeenCalled();
  });

  it('creates a snapshot and updates season when end is in the past', async () => {
    prisma.group.findUnique.mockResolvedValue({
      id: groupId,
      activeSeasonEndsAt: new Date('2026-02-01T00:00:00.000Z'),
      activeSeasonStartedAt: new Date('2026-01-01T00:00:00.000Z'),
      activeSeasonName: 'Season B',
      seasonPauseDays: 2,
      seasonPauseUntil: null,
    });

    const createSeasonSnapshot = vi.fn().mockResolvedValue({ id: 'snapshot-1' });
    (service as any).createSeasonSnapshot = createSeasonSnapshot;

    await service.ensureSeasonUpToDate(groupId);

    expect(createSeasonSnapshot).toHaveBeenCalledWith(
      groupId,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-02-01T00:00:00.000Z'),
      'Season B',
    );

    const durationMs =
      new Date('2026-02-01T00:00:00.000Z').getTime() -
      new Date('2026-01-01T00:00:00.000Z').getTime();
    const pauseUntil = new Date(fixedNow.getTime() + 2 * 24 * 60 * 60 * 1000);
    const newStart = pauseUntil;
    const newEnd = new Date(newStart.getTime() + durationMs);

    expect(prisma.group.update).toHaveBeenCalledWith({
      where: { id: groupId },
      data: {
        lastSeasonId: 'snapshot-1',
        activeSeasonName: null,
        activeSeasonStartedAt: newStart,
        activeSeasonEndsAt: newEnd,
        seasonPauseUntil: pauseUntil,
      },
    });

    expect(eventsService.log).toHaveBeenNthCalledWith(
      1,
      groupId,
      'SEASON_ENDED',
      'Season B has ended',
    );
    expect(eventsService.log).toHaveBeenNthCalledWith(
      2,
      groupId,
      'SEASON_STARTED',
      'Season B has started',
    );
  });

  it('resetSeason clears active season and keeps planned next season when a pause is pending', async () => {
    prisma.group.findUnique.mockResolvedValue({
      id: groupId,
      activeSeasonEndsAt: new Date('2026-03-01T00:00:00.000Z'),
      activeSeasonStartedAt: new Date('2026-01-01T00:00:00.000Z'),
      activeSeasonName: 'Season C',
      nextSeasonName: 'Season D',
      nextSeasonStartsAt: new Date('2026-02-20T00:00:00.000Z'),
      nextSeasonEndsAt: new Date('2026-03-20T00:00:00.000Z'),
      nextSeasonIsSuccessive: false,
      nextSeasonInterval: null,
      nextSeasonIntermissionDays: 0,
      seasonPauseDays: 0,
      seasonPauseUntil: null,
    });

    const createSeasonSnapshot = vi.fn().mockResolvedValue({ id: 'snapshot-2' });
    (service as any).createSeasonSnapshot = createSeasonSnapshot;

    await service.resetSeason(groupId, 'admin-1');

    expect(membershipService.ensureAdmin).toHaveBeenCalledWith(groupId, 'admin-1');
    expect(createSeasonSnapshot).toHaveBeenCalledWith(
      groupId,
      new Date('2026-01-01T00:00:00.000Z'),
      fixedNow,
      'Season C',
    );
    expect(prisma.group.update).toHaveBeenCalledWith({
      where: { id: groupId },
      data: {
        lastSeasonId: 'snapshot-2',
        activeSeasonName: null,
        activeSeasonStartedAt: null,
        activeSeasonEndsAt: null,
        seasonPauseUntil: new Date('2026-02-20T00:00:00.000Z'),
      },
    });
    expect(eventsService.log).toHaveBeenCalledTimes(1);
    expect(eventsService.log).toHaveBeenCalledWith(
      groupId,
      'SEASON_ENDED',
      'Season C has ended',
    );
  });

  it('resetSeason clears pause and planned next season while waiting for next season start', async () => {
    prisma.group.findUnique.mockResolvedValue({
      id: groupId,
      activeSeasonEndsAt: null,
      activeSeasonStartedAt: null,
      activeSeasonName: null,
      nextSeasonName: 'Season E',
      nextSeasonStartsAt: new Date('2026-02-15T00:00:00.000Z'),
      nextSeasonEndsAt: new Date('2026-03-15T00:00:00.000Z'),
      nextSeasonIsSuccessive: true,
      nextSeasonInterval: 'MONTHLY',
      nextSeasonIntermissionDays: 3,
      seasonPauseDays: 3,
      seasonPauseUntil: new Date('2026-02-15T00:00:00.000Z'),
    });

    const createSeasonSnapshot = vi.fn();
    (service as any).createSeasonSnapshot = createSeasonSnapshot;

    await service.resetSeason(groupId, 'admin-1');

    expect(membershipService.ensureAdmin).toHaveBeenCalledWith(groupId, 'admin-1');
    expect(prisma.group.update).toHaveBeenCalledWith({
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
    expect(createSeasonSnapshot).not.toHaveBeenCalled();
    expect(eventsService.log).toHaveBeenCalledWith(
      groupId,
      'SEASON_UPDATED',
      'Season pause and planned next season were removed.',
    );
  });
});
