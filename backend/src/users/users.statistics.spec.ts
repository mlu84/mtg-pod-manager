import { describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService.getUserStatistics', () => {
  it('aggregates favorite color combinations and color usage from all user decks in canonical form', async () => {
    const prisma = {
      deck: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { colors: 'Azorius', performanceRating: 3 },
            { colors: 'WU', performanceRating: 4 },
            { colors: 'Bant', performanceRating: 2 },
            { colors: 'GWU', performanceRating: 5 },
            { colors: 'Colorless', performanceRating: 1 },
            { colors: 'C', performanceRating: 1 },
          ])
          .mockResolvedValueOnce([{ performanceRating: 3 }]),
      },
      gamePlacement: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      user: {
        count: vi.fn().mockResolvedValue(1),
      },
    };
    const mailService = {
      sendFeedbackConfirmationEmail: vi.fn(),
    };
    const service = new UsersService(prisma as any, mailService as any);

    const result = await service.getUserStatistics('user-1', {
      from: '2026-02-01',
      to: '2026-02-07',
    });

    expect(result.favoriteColorCombinations).toEqual([
      { label: 'C', count: 2 },
      { label: 'WU', count: 2 },
      { label: 'WUG', count: 2 },
    ]);
    expect(result.colors.values).toEqual([4, 4, 0, 0, 2, 2]);
  });

  it('keeps color usage all-time values stable across different date filters', async () => {
    const ownDecksAllTime = [
      { colors: 'Mono-White', performanceRating: 3 },
      { colors: 'Mono-Blue', performanceRating: 3 },
      { colors: 'Azorius', performanceRating: 3 },
      { colors: 'WU', performanceRating: 3 },
      { colors: 'Jund', performanceRating: 3 },
      { colors: 'Colorless', performanceRating: 3 },
    ];

    const makePrisma = () => ({
      deck: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce(ownDecksAllTime)
          .mockResolvedValueOnce([{ performanceRating: 3 }]),
      },
      gamePlacement: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      user: {
        count: vi.fn().mockResolvedValue(1),
      },
    });
    const mailService = {
      sendFeedbackConfirmationEmail: vi.fn(),
    };

    const serviceA = new UsersService(makePrisma() as any, mailService as any);
    const serviceB = new UsersService(makePrisma() as any, mailService as any);

    const narrowRange = await serviceA.getUserStatistics('user-1', {
      from: '2026-02-01',
      to: '2026-02-01',
    });
    const wideRange = await serviceB.getUserStatistics('user-1', {
      from: '2025-01-01',
      to: '2026-12-31',
    });

    expect(narrowRange.colors.values).toEqual([3, 3, 1, 1, 1, 1]);
    expect(wideRange.colors.values).toEqual([3, 3, 1, 1, 1, 1]);
    expect(narrowRange.colors.values).toEqual(wideRange.colors.values);
  });

  it('uses full all-time range and ignores from/to when allTime is true', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'));

    const prisma = {
      deck: {
        aggregate: vi.fn().mockResolvedValue({
          _min: { createdAt: new Date('2024-01-10T15:00:00.000Z') },
        }),
        findMany: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ colors: 'WU', performanceRating: 3 }])
          .mockResolvedValueOnce([{ performanceRating: 3 }]),
      },
      game: {
        aggregate: vi.fn().mockResolvedValue({
          _min: { createdAt: new Date('2024-01-05T09:30:00.000Z') },
        }),
      },
      gamePlacement: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      user: {
        count: vi.fn().mockResolvedValue(1),
      },
    };
    const mailService = {
      sendFeedbackConfirmationEmail: vi.fn(),
    };
    const service = new UsersService(prisma as any, mailService as any);

    const result = await service.getUserStatistics('user-1', {
      from: '2026-02-01',
      to: '2026-02-07',
      allTime: true,
    });

    expect(result.range.from).toBe('2024-01-05T00:00:00.000Z');
    expect(result.range.to).toBe('2026-03-01T12:00:00.000Z');
    expect(result.range.bucket).toBe('day');
    expect(prisma.deck.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          ownerId: 'user-1',
          createdAt: {
            gte: new Date('2024-01-05T00:00:00.000Z'),
            lte: new Date('2026-03-01T12:00:00.000Z'),
          },
        },
      }),
    );
    expect(prisma.deck.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date('2024-01-05T00:00:00.000Z'),
            lte: new Date('2026-03-01T12:00:00.000Z'),
          },
        },
      }),
    );
    expect(prisma.gamePlacement.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          userId: 'user-1',
          game: {
            createdAt: {
              gte: new Date('2024-01-05T00:00:00.000Z'),
              lte: new Date('2026-03-01T12:00:00.000Z'),
            },
          },
        },
      }),
    );
    expect(prisma.gamePlacement.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          userId: { not: null },
          game: {
            createdAt: {
              gte: new Date('2024-01-05T00:00:00.000Z'),
              lte: new Date('2026-03-01T12:00:00.000Z'),
            },
          },
        },
      }),
    );

    vi.useRealTimers();
  });
});
