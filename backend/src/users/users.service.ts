import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma, SystemRole } from '@prisma/client';
import { toImageDataUrl } from './users-image.util';
import { validateImageUploadFile } from '../common/upload/image-upload.util';
import { deleteGroupWithRelations } from '../common/prisma/group-delete.util';
import { MailService } from '../mail/mail.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UserStatisticsQueryDto } from './dto/user-statistics-query.dto';

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'] as const;
const DECK_COLOR_TO_CANONICAL_CODE: Record<string, string> = {
  colorless: 'C',
  c: 'C',
  monowhite: 'W',
  monoblue: 'U',
  monoblack: 'B',
  monored: 'R',
  monogreen: 'G',
  azorius: 'WU',
  dimir: 'UB',
  rakdos: 'BR',
  gruul: 'RG',
  selesnya: 'WG',
  orzhov: 'WB',
  izzet: 'UR',
  golgari: 'BG',
  boros: 'WR',
  simic: 'UG',
  bant: 'WUG',
  esper: 'WUB',
  grixis: 'UBR',
  jund: 'BRG',
  naya: 'WRG',
  abzan: 'WBG',
  jeskai: 'WUR',
  sultai: 'UBG',
  mardu: 'WBR',
  temur: 'URG',
  growth: 'WUBG',
  artifice: 'WUBR',
  aggression: 'UBRG',
  altruism: 'WURG',
  chaos: 'WBRG',
  wubrg: 'WUBRG',
};

const profileSelect = {
  id: true,
  email: true,
  inAppName: true,
  emailVerified: true,
  hasUnreadNews: true,
  createdAt: true,
  avatarImage: true,
  avatarImageMime: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async findOne(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async verifyEmail(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
    });
  }

  async setEmailVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: expiresAt,
      },
    });
  }

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: expiresAt,
      },
    });
  }

  async consumePasswordResetToken(
    tokenHash: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: {
          gt: new Date(),
        },
      },
      data: {
        password: hashedPassword,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return result.count > 0;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });

    return user ? this.toProfileResponse(user) : null;
  }

  async getApplications(userId: string) {
    const applications = await this.prisma.groupApplication.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            format: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return applications.map((app) => ({
      group: app.group,
      createdAt: app.createdAt,
    }));
  }

  async getNewsStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { hasUnreadNews: true },
    });

    return {
      hasUnreadNews: user?.hasUnreadNews ?? false,
    };
  }

  async markNewsAsRead(userId: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { hasUnreadNews: false },
      select: { hasUnreadNews: true },
    });

    return {
      hasUnreadNews: updated.hasUnreadNews,
    };
  }

  async updateProfile(userId: string, data: { inAppName?: string }) {
    if (data.inAppName) {
      // Check if name is already taken by another user
      const existing = await this.prisma.user.findFirst({
        where: {
          inAppName: data.inAppName,
          NOT: { id: userId },
        },
      });

      if (existing) {
        throw new ConflictException('This display name is already taken');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        inAppName: data.inAppName,
      },
      select: profileSelect,
    });

    return this.toProfileResponse(user);
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    validateImageUploadFile(file);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarImage: file.buffer,
        avatarImageMime: file.mimetype,
      },
      select: {
        avatarImage: true,
        avatarImageMime: true,
      },
    });

    return {
      avatarUrl: toImageDataUrl(updated.avatarImage, updated.avatarImageMime),
    };
  }

  async deleteOwnAccount(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        inAppName: true,
        systemRole: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.systemRole === SystemRole.SYSADMIN) {
      throw new ForbiddenException('Sysadmin accounts cannot be deleted');
    }

    await this.prisma.$transaction(async (tx) => {
      const memberships = await tx.usersOnGroups.findMany({
        where: { userId },
        select: {
          groupId: true,
          role: true,
        },
      });

      const groupsToDelete = new Set<string>();
      const groupsToKeep = new Set<string>();

      for (const membership of memberships) {
        const otherMembers = await tx.usersOnGroups.findMany({
          where: {
            groupId: membership.groupId,
            NOT: { userId },
          },
          select: {
            userId: true,
            role: true,
            assignedAt: true,
          },
          orderBy: [{ assignedAt: 'asc' }, { userId: 'asc' }],
        });

        if (otherMembers.length === 0) {
          groupsToDelete.add(membership.groupId);
          continue;
        }

        if (membership.role === 'ADMIN' && !otherMembers.some((m) => m.role === 'ADMIN')) {
          const successor = otherMembers[0];
          await tx.usersOnGroups.update({
            where: {
              userId_groupId: {
                userId: successor.userId,
                groupId: membership.groupId,
              },
            },
            data: {
              role: 'ADMIN',
            },
          });
        }

        await tx.usersOnGroups.delete({
          where: {
            userId_groupId: {
              userId,
              groupId: membership.groupId,
            },
          },
        });

        groupsToKeep.add(membership.groupId);
      }

      const groupsToDeleteList = [...groupsToDelete];
      const groupsToKeepList = [...groupsToKeep];

      const ownedDecks = await tx.deck.findMany({
        where: {
          ownerId: userId,
          ...(groupsToDeleteList.length > 0
            ? { groupId: { notIn: groupsToDeleteList } }
            : {}),
        },
        select: {
          id: true,
        },
      });

      const ownedDeckIds = ownedDecks.map((deck) => deck.id);
      if (ownedDeckIds.length > 0) {
        await tx.gamePlacement.updateMany({
          where: { deckId: { in: ownedDeckIds } },
          data: { deletedDeckName: 'Deleted Deck' },
        });

        await tx.deck.deleteMany({
          where: {
            id: { in: ownedDeckIds },
          },
        });
      }

      await tx.gamePlacement.updateMany({
        where: { userId },
        data: { userId: null },
      });

      for (const groupId of groupsToDeleteList) {
        await deleteGroupWithRelations(tx, groupId);
      }

      for (const groupId of groupsToKeepList) {
        await tx.groupEvent.create({
          data: {
            groupId,
            type: 'USER_ACCOUNT_DELETED',
            message: `${user.inAppName} deleted their account`,
          },
        });
      }

      await tx.user.delete({
        where: { id: userId },
      });
    });

    return { message: 'Account deleted successfully' };
  }

  async submitFeedback(userId: string, dto: CreateFeedbackDto) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const feedbackCount = await this.prisma.feedbackEntry.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (feedbackCount >= 5) {
      throw new HttpException(
        'Feedback rate limit reached (5 submissions per hour). Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const text = dto.text.trim();
    const contactEmail = dto.contactEmail?.trim().toLowerCase() || null;

    const [feedback, user] = await this.prisma.$transaction([
      this.prisma.feedbackEntry.create({
        data: {
          userId,
          text,
          rating: dto.rating ?? null,
          contactEmail,
        },
        select: {
          id: true,
          createdAt: true,
          rating: true,
          contactEmail: true,
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { inAppName: true },
      }),
    ]);

    if (contactEmail) {
      try {
        await this.mailService.sendFeedbackConfirmationEmail({
          to: contactEmail,
          inAppName: user?.inAppName ?? 'there',
        });
      } catch (error) {
        this.logger.warn(
          `Feedback confirmation email failed for ${contactEmail}: ${(error as Error).message}`,
        );
      }
    }

    return {
      message: 'Feedback submitted successfully',
      feedback,
    };
  }

  async getUserStatistics(userId: string, queryDto: UserStatisticsQueryDto) {
    const range = this.resolveStatisticsDateRange(queryDto.from, queryDto.to);
    const labels = this.buildStatisticsLabels(range);

    const [
      userDeckRows,
      allDeckRows,
      userPlacementRows,
      allPlacementRows,
      ownDecksAllTime,
      allDecksAllTime,
      totalUsers,
    ] = await Promise.all([
      this.prisma.deck.findMany({
        where: {
          ownerId: userId,
          createdAt: {
            gte: range.fromDate,
            lte: range.toDate,
          },
        },
        select: { createdAt: true },
      }),
      this.prisma.deck.findMany({
        where: {
          createdAt: {
            gte: range.fromDate,
            lte: range.toDate,
          },
        },
        select: { createdAt: true },
      }),
      this.prisma.gamePlacement.findMany({
        where: {
          userId,
          game: {
            createdAt: {
              gte: range.fromDate,
              lte: range.toDate,
            },
          },
        },
        select: {
          game: {
            select: { createdAt: true },
          },
        },
      }),
      this.prisma.gamePlacement.findMany({
        where: {
          userId: { not: null },
          game: {
            createdAt: {
              gte: range.fromDate,
              lte: range.toDate,
            },
          },
        },
        select: {
          game: {
            select: { createdAt: true },
          },
        },
      }),
      this.prisma.deck.findMany({
        where: { ownerId: userId },
        select: {
          colors: true,
          performanceRating: true,
        },
      }),
      this.prisma.deck.findMany({
        select: { performanceRating: true },
      }),
      this.prisma.user.count(),
    ]);

    const userDeckSeries = this.countByStatisticsRange(
      userDeckRows.map((entry) => entry.createdAt),
      range,
    );
    const allDeckSeriesTotal = this.countByStatisticsRange(
      allDeckRows.map((entry) => entry.createdAt),
      range,
    );
    const userGamesSeries = this.countByStatisticsRange(
      userPlacementRows.map((entry) => entry.game.createdAt),
      range,
    );
    const allGamesSeriesTotal = this.countByStatisticsRange(
      allPlacementRows.map((entry) => entry.game.createdAt),
      range,
    );

    const divisor = totalUsers > 0 ? totalUsers : 1;
    const averageDeckSeries = allDeckSeriesTotal.map((value) =>
      Number((value / divisor).toFixed(2)),
    );
    const averageGamesSeries = allGamesSeriesTotal.map((value) =>
      Number((value / divisor).toFixed(2)),
    );

    const colorUsageCounts: Record<'W' | 'U' | 'B' | 'R' | 'G' | 'Colorless', number> = {
      W: 0,
      U: 0,
      B: 0,
      R: 0,
      G: 0,
      Colorless: 0,
    };

    const comboValues: string[] = [];
    for (const deck of ownDecksAllTime) {
      const canonicalColors = this.toCanonicalColorCode(deck.colors);
      if (!canonicalColors) {
        continue;
      }
      comboValues.push(canonicalColors);

      if (canonicalColors === 'C') {
        colorUsageCounts.Colorless += 1;
        continue;
      }

      for (const color of COLOR_ORDER) {
        if (canonicalColors.includes(color)) {
          colorUsageCounts[color] += 1;
        }
      }
    }

    const ownPerformanceValues = ownDecksAllTime.map((deck) => deck.performanceRating);
    const globalPerformanceValues = allDecksAllTime.map((deck) => deck.performanceRating);

    const ownPerformanceAverage = ownPerformanceValues.length
      ? Number(
          (
            ownPerformanceValues.reduce((sum, value) => sum + value, 0) /
            ownPerformanceValues.length
          ).toFixed(2),
        )
      : 0;
    const globalPerformanceAverage = globalPerformanceValues.length
      ? Number(
          (
            globalPerformanceValues.reduce((sum, value) => sum + value, 0) /
            globalPerformanceValues.length
          ).toFixed(2),
        )
      : 0;

    return {
      range: {
        from: range.fromDate.toISOString(),
        to: range.toDate.toISOString(),
        bucket: range.bucket,
        labels,
      },
      decks: {
        userTotal: userDeckRows.length,
        averageTotal: Number((allDeckRows.length / divisor).toFixed(2)),
        series: {
          user: userDeckSeries,
          average: averageDeckSeries,
        },
      },
      games: {
        userTotal: userPlacementRows.length,
        averageTotal: Number((allPlacementRows.length / divisor).toFixed(2)),
        series: {
          user: userGamesSeries,
          average: averageGamesSeries,
        },
      },
      colors: {
        labels: ['W', 'U', 'B', 'R', 'G', 'Colorless'],
        values: [
          colorUsageCounts.W,
          colorUsageCounts.U,
          colorUsageCounts.B,
          colorUsageCounts.R,
          colorUsageCounts.G,
          colorUsageCounts.Colorless,
        ],
      },
      favoriteColorCombinations: this.toTopCountList(comboValues, 10),
      performance: {
        userAverage: ownPerformanceAverage,
        globalAverage: globalPerformanceAverage,
      },
    };
  }

  private countByStatisticsRange(
    timestamps: Date[],
    range: { fromDate: Date; toDate: Date; bucket: 'hour' | 'day' },
  ) {
    const labels = this.buildStatisticsLabels(range);
    const values = labels.map(() => 0);

    for (const timestamp of timestamps) {
      const index = this.resolveStatisticsBucketIndex(timestamp, range);
      if (index >= 0 && index < values.length) {
        values[index] += 1;
      }
    }

    return values;
  }

  private resolveStatisticsBucketIndex(
    timestamp: Date,
    range: { fromDate: Date; toDate: Date; bucket: 'hour' | 'day' },
  ) {
    if (timestamp < range.fromDate || timestamp > range.toDate) {
      return -1;
    }

    if (range.bucket === 'hour') {
      return timestamp.getUTCHours();
    }

    const fromDay = Date.UTC(
      range.fromDate.getUTCFullYear(),
      range.fromDate.getUTCMonth(),
      range.fromDate.getUTCDate(),
    );
    const eventDay = Date.UTC(
      timestamp.getUTCFullYear(),
      timestamp.getUTCMonth(),
      timestamp.getUTCDate(),
    );
    return Math.floor((eventDay - fromDay) / (24 * 60 * 60 * 1000));
  }

  private buildStatisticsLabels(range: {
    fromDate: Date;
    toDate: Date;
    bucket: 'hour' | 'day';
  }) {
    if (range.bucket === 'hour') {
      return Array.from({ length: 24 }).map((_, hour) => `${hour.toString().padStart(2, '0')}:00`);
    }

    const labels: string[] = [];
    const cursor = new Date(range.fromDate);
    cursor.setUTCHours(0, 0, 0, 0);
    const end = new Date(range.toDate);
    end.setUTCHours(23, 59, 59, 999);

    while (cursor <= end) {
      labels.push(
        `${cursor.getUTCFullYear()}-${(cursor.getUTCMonth() + 1)
          .toString()
          .padStart(2, '0')}-${cursor.getUTCDate().toString().padStart(2, '0')}`,
      );
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return labels;
  }

  private toTopCountList(values: string[], limit: number) {
    const counts = new Map<string, number>();
    for (const value of values) {
      const key = value.trim() || 'Unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, limit);
  }

  private toCanonicalColorCode(rawColors?: string | null): string {
    const normalized = (rawColors || '').trim().toLowerCase();
    if (!normalized) {
      return '';
    }

    const compact = normalized.replace(/[\s_-]+/g, '');
    const mappedValue = DECK_COLOR_TO_CANONICAL_CODE[compact];
    if (mappedValue) {
      return mappedValue;
    }

    const upper = normalized.toUpperCase();
    const ordered = COLOR_ORDER.filter((color) => upper.includes(color)).join('');
    return ordered || (compact === 'colorless' || compact === 'c' ? 'C' : '');
  }

  private resolveStatisticsDateRange(from?: string, to?: string) {
    const parseStartOfDay = (value: string) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid statistics date range');
      }
      return date;
    };

    const parseEndOfDay = (value: string) => {
      const date = new Date(`${value}T23:59:59.999Z`);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid statistics date range');
      }
      return date;
    };

    const now = new Date();
    let fromDate = from ? parseStartOfDay(from) : null;
    let toDate = to ? parseEndOfDay(to) : null;

    if (!fromDate && !toDate) {
      toDate = now;
      fromDate = new Date(now);
      fromDate.setUTCDate(fromDate.getUTCDate() - 6);
      fromDate.setUTCHours(0, 0, 0, 0);
    } else if (!fromDate && toDate) {
      fromDate = new Date(toDate);
      fromDate.setUTCDate(fromDate.getUTCDate() - 6);
      fromDate.setUTCHours(0, 0, 0, 0);
    } else if (fromDate && !toDate) {
      toDate = new Date(fromDate);
      toDate.setUTCDate(toDate.getUTCDate() + 6);
      toDate.setUTCHours(23, 59, 59, 999);
    }

    if (!fromDate || !toDate) {
      throw new BadRequestException('Invalid statistics date range');
    }

    if (fromDate > toDate) {
      const swappedFrom = new Date(toDate);
      swappedFrom.setUTCHours(0, 0, 0, 0);
      const swappedTo = new Date(fromDate);
      swappedTo.setUTCHours(23, 59, 59, 999);
      fromDate = swappedFrom;
      toDate = swappedTo;
    }

    if (toDate > now) {
      toDate = now;
    }

    const sameDay =
      fromDate.getUTCFullYear() === toDate.getUTCFullYear() &&
      fromDate.getUTCMonth() === toDate.getUTCMonth() &&
      fromDate.getUTCDate() === toDate.getUTCDate();

    return {
      fromDate,
      toDate,
      bucket: sameDay ? ('hour' as const) : ('day' as const),
    };
  }

  private toProfileResponse(user: {
    id: string;
    email: string;
    inAppName: string;
    emailVerified: Date | null;
    hasUnreadNews: boolean;
    createdAt: Date;
    avatarImage: Buffer | null;
    avatarImageMime: string | null;
  }) {
    const { avatarImage, avatarImageMime, ...profile } = user;
    return {
      ...profile,
      avatarUrl: toImageDataUrl(avatarImage, avatarImageMime),
    };
  }
}
