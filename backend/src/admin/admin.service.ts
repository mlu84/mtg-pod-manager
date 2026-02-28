import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateNewsEntryDto } from './dto/create-news-entry.dto';
import { AdminListFeedbackQueryDto } from './dto/list-feedback-query.dto';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  async searchGroups(query: string, page?: number, pageSize?: number) {
    const trimmedQuery = (query || '').trim();
    const safePage = Number.isFinite(page) && Number(page) > 0 ? Number(page) : 1;
    const safePageSize =
      Number.isFinite(pageSize) && Number(pageSize) > 0
        ? Math.min(Number(pageSize), 20)
        : 10;

    const where = trimmedQuery
      ? { name: { contains: trimmedQuery } }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.group.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        select: {
          id: true,
          name: true,
          description: true,
          format: true,
          members: {
            select: {
              userId: true,
              role: true,
              user: {
                select: {
                  id: true,
                  inAppName: true,
                  email: true,
                },
              },
            },
            orderBy: { assignedAt: 'asc' },
          },
        },
      }),
      this.prisma.group.count({ where }),
    ]);

    return {
      items: items.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        format: g.format,
        members: g.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          user: m.user,
        })),
      })),
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async deleteGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.gamePlacement.deleteMany({
        where: { game: { groupId } },
      });
      await tx.game.deleteMany({ where: { groupId } });
      await tx.deck.deleteMany({ where: { groupId } });
      await tx.groupEvent.deleteMany({ where: { groupId } });
      await tx.groupApplication.deleteMany({ where: { groupId } });
      await tx.usersOnGroups.deleteMany({ where: { groupId } });
      await tx.group.delete({ where: { id: groupId } });
    });

    return { message: 'Group deleted' };
  }

  async renameUser(userId: string, inAppName: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        inAppName,
        NOT: { id: userId },
      },
    });

    if (existing) {
      throw new ConflictException('This display name is already taken');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, inAppName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { inAppName },
    });

    const memberships = await this.prisma.usersOnGroups.findMany({
      where: { userId },
      select: { groupId: true },
    });

    await Promise.all(
      memberships.map((m) =>
        this.eventsService.log(
          m.groupId,
          'USER_RENAMED',
          `${user.inAppName} hei\u00dft jetzt ${inAppName}`,
        ),
      ),
    );

    return { message: 'User renamed' };
  }

  async updateMemberRole(groupId: string, userId: string, role: 'ADMIN' | 'MEMBER') {
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      include: {
        user: { select: { inAppName: true } },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this group');
    }

    if (membership.role === role) {
      return { message: 'Member role already set' };
    }

    if (membership.role === 'ADMIN' && role === 'MEMBER') {
      const adminCount = await this.prisma.usersOnGroups.count({
        where: { groupId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('At least one admin must remain in the group');
      }
    }

    await this.prisma.usersOnGroups.update({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      data: { role },
    });

    await this.eventsService.log(
      groupId,
      role === 'ADMIN' ? 'MEMBER_PROMOTED' : 'MEMBER_DEMOTED',
      `${membership.user.inAppName} was ${role === 'ADMIN' ? 'promoted to admin' : 'demoted to member'}`,
    );

    return { message: 'Member role updated' };
  }

  async removeMember(groupId: string, userId: string) {
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      include: {
        user: { select: { inAppName: true } },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this group');
    }

    if (membership.role === 'ADMIN') {
      const adminCount = await this.prisma.usersOnGroups.count({
        where: { groupId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('At least one admin must remain in the group');
      }
    }

    await this.prisma.usersOnGroups.delete({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    await this.eventsService.log(
      groupId,
      'MEMBER_REMOVED',
      `${membership.user.inAppName} was removed from the group`,
    );

    return { message: 'Member removed' };
  }

  async deleteUserAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, inAppName: true, systemRole: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.systemRole === SystemRole.SYSADMIN) {
      throw new ForbiddenException('Cannot delete sysadmin account');
    }

    const memberships = await this.prisma.usersOnGroups.findMany({
      where: { userId },
      select: { groupId: true },
    });

    const deckIds = await this.prisma.deck.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, groupId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (deckIds.length > 0) {
        await tx.gamePlacement.updateMany({
          where: { deckId: { in: deckIds.map((d) => d.id) } },
          data: { deletedDeckName: 'Deleted Deck' },
        });
        await tx.deck.deleteMany({
          where: { id: { in: deckIds.map((d) => d.id) } },
        });
      }

      await tx.gamePlacement.updateMany({
        where: { userId },
        data: { userId: null },
      });

      await tx.groupApplication.deleteMany({ where: { userId } });
      await tx.usersOnGroups.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    await Promise.all(
      memberships.map((m) =>
        this.eventsService.log(
          m.groupId,
          'USER_ACCOUNT_DELETED',
          `User ${user.inAppName} was deleted`,
        ),
      ),
    );

    return { message: 'User deleted' };
  }

  async createNewsEntry(userId: string, dto: CreateNewsEntryDto) {
    const title = dto.title.trim();
    const content = dto.content.trim();
    if (!title || !content) {
      throw new BadRequestException('Title and content must not be empty');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const news = await tx.newsEntry.create({
        data: {
          title,
          content,
          createdByUserId: userId,
        },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          createdByUserId: true,
        },
      });

      await tx.user.updateMany({
        data: {
          hasUnreadNews: true,
        },
      });

      return news;
    });

    return {
      message: 'News entry created and unread marker set for all users',
      news: result,
    };
  }

  async listFeedback(queryDto: AdminListFeedbackQueryDto) {
    const query = (queryDto.query || '').trim();
    const safePage = Number.isFinite(queryDto.page) && Number(queryDto.page) > 0
      ? Number(queryDto.page)
      : 1;
    const safePageSize =
      Number.isFinite(queryDto.pageSize) && Number(queryDto.pageSize) > 0
        ? Math.min(Number(queryDto.pageSize), 50)
        : 20;

    const { fromDate, toDate } = this.resolveFeedbackDateRange(queryDto.from, queryDto.to);

    const where = {
      ...(query
        ? {
            OR: [
              { text: { contains: query } },
              { contactEmail: { contains: query } },
              { user: { inAppName: { contains: query } } },
            ],
          }
        : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
      ...(queryDto.status === 'unread'
        ? { isRead: false }
        : queryDto.status === 'read'
          ? { isRead: true }
          : {}),
    } as const;

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.feedbackEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        select: {
          id: true,
          text: true,
          rating: true,
          contactEmail: true,
          isRead: true,
          readAt: true,
          createdAt: true,
          userId: true,
          user: {
            select: {
              inAppName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.feedbackEntry.count({ where }),
      this.prisma.feedbackEntry.count({ where: { isRead: false } }),
    ]);

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
      unreadCount,
    };
  }

  async getFeedbackUnreadCount() {
    const unreadCount = await this.prisma.feedbackEntry.count({
      where: { isRead: false },
    });

    return { unreadCount };
  }

  async markFeedbackAsRead(ids: string[]) {
    const distinctIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (distinctIds.length === 0) {
      throw new BadRequestException('No feedback ids provided');
    }

    const result = await this.prisma.feedbackEntry.updateMany({
      where: { id: { in: distinctIds } },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: 'Feedback entries marked as read',
      affected: result.count,
    };
  }

  async deleteFeedback(ids: string[]) {
    const distinctIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (distinctIds.length === 0) {
      throw new BadRequestException('No feedback ids provided');
    }

    const result = await this.prisma.feedbackEntry.deleteMany({
      where: { id: { in: distinctIds } },
    });

    return {
      message: 'Feedback entries deleted',
      affected: result.count,
    };
  }

  async getAnalytics(queryDto: AdminAnalyticsQueryDto) {
    const range = this.resolveAnalyticsDateRange(queryDto.from, queryDto.to);
    const labels = this.buildRangeLabels(range);

    const [
      userRows,
      groupRows,
      deckRows,
      gameRows,
      inviteRows,
      popularDeckColors,
      playedPlacements,
      userCount,
      groupsMembershipCount,
      activeSeasonsCount,
      liveUsersNowCount,
      concurrentActiveUsers,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          createdAt: {
            gte: range.fromDate,
            lte: range.toDate,
          },
        },
        select: { createdAt: true },
      }),
      this.prisma.group.findMany({
        where: {
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
      this.prisma.game.findMany({
        where: {
          createdAt: {
            gte: range.fromDate,
            lte: range.toDate,
          },
        },
        select: { createdAt: true },
      }),
      this.prisma.groupInvite.findMany({
        where: {
          createdAt: {
            gte: range.fromDate,
            lte: range.toDate,
          },
        },
        select: {
          createdAt: true,
          type: true,
        },
      }),
      this.prisma.deck.findMany({
        select: { colors: true },
      }),
      this.prisma.gamePlacement.findMany({
        where: {
          game: {
            createdAt: {
              gte: range.fromDate,
              lte: range.toDate,
            },
          },
        },
        select: {
          deck: {
            select: {
              colors: true,
              type: true,
            },
          },
        },
      }),
      this.prisma.user.count(),
      this.prisma.usersOnGroups.count(),
      this.prisma.group.count({
        where: {
          activeSeasonEndsAt: {
            gte: new Date(),
          },
        },
      }),
      this.prisma.userActivityPulse.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000),
          },
        },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.buildConcurrentActiveUsersSeries(range),
    ]);

    const usersHistory = this.countByRange(userRows.map((entry) => entry.createdAt), range);
    const groupsCreated = this.countByRange(groupRows.map((entry) => entry.createdAt), range);
    const decksCreated = this.countByRange(deckRows.map((entry) => entry.createdAt), range);
    const recordedGames = this.countByRange(gameRows.map((entry) => entry.createdAt), range);

    const invitesEmail = this.countByRange(
      inviteRows
        .filter((entry) => entry.type === 'EMAIL')
        .map((entry) => entry.createdAt),
      range,
    );
    const invitesInternal = this.countByRange(
      inviteRows
        .filter((entry) => entry.type === 'USER')
        .map((entry) => entry.createdAt),
      range,
    );
    const invitesTotal = invitesEmail.map(
      (count, index) => count + invitesInternal[index],
    );

    const popularColorCombinations = this.toTopCounts(
      popularDeckColors.map((deck) => deck.colors || 'Unknown'),
      10,
    );
    const mostPlayedColorCombinations = this.toTopCounts(
      playedPlacements
        .map((placement) => placement.deck?.colors || null)
        .filter((value): value is string => !!value),
      10,
    );
    const mostPlayedDeckTypes = this.toTopCounts(
      playedPlacements.map((placement) => placement.deck?.type?.trim() || 'Unknown'),
      10,
    );

    const avgGroupsPerUser =
      userCount > 0 ? Number((groupsMembershipCount / userCount).toFixed(2)) : 0;

    return {
      range: {
        from: range.fromDate.toISOString(),
        to: range.toDate.toISOString(),
        bucket: range.bucket,
        labels,
      },
      cards: {
        liveUsersNow: liveUsersNowCount.length,
        averageGroupsPerUser: avgGroupsPerUser,
        activeSeasons: activeSeasonsCount,
      },
      series: {
        usersHistory,
        groupsCreated,
        decksCreated,
        recordedGames,
        invites: {
          email: invitesEmail,
          internal: invitesInternal,
          total: invitesTotal,
        },
        concurrentActiveUsers,
      },
      rankings: {
        popularColorCombinations,
        mostPlayedColorCombinations,
        mostPlayedDeckTypes,
      },
    };
  }

  private async buildConcurrentActiveUsersSeries(range: {
    fromDate: Date;
    toDate: Date;
    bucket: 'hour' | 'day';
  }) {
    const lookbackFrom = new Date(range.fromDate.getTime() - 15 * 60 * 1000);
    const pulses = await this.prisma.userActivityPulse.findMany({
      where: {
        createdAt: {
          gte: lookbackFrom,
          lte: range.toDate,
        },
      },
      select: {
        userId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (range.bucket === 'hour') {
      const buckets = this.getHourlyBuckets(range.fromDate, range.toDate);
      return buckets.map((bucketStart) => {
        const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000);
        const activeUserIds = new Set<string>();
        for (const pulse of pulses) {
          if (pulse.createdAt <= bucketEnd && pulse.createdAt > new Date(bucketEnd.getTime() - 15 * 60 * 1000)) {
            activeUserIds.add(pulse.userId);
          }
        }
        return activeUserIds.size;
      });
    }

    const dayBuckets = this.getDailyBuckets(range.fromDate, range.toDate);
    return dayBuckets.map((dayStart) => {
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      const hourlySamples: number[] = [];
      for (let hour = 0; hour < 24; hour += 1) {
        const bucketEnd = new Date(dayStart);
        bucketEnd.setUTCHours(hour + 1, 0, 0, 0);
        if (bucketEnd > range.toDate) {
          break;
        }
        const activeUserIds = new Set<string>();
        for (const pulse of pulses) {
          if (pulse.createdAt <= bucketEnd && pulse.createdAt > new Date(bucketEnd.getTime() - 15 * 60 * 1000)) {
            activeUserIds.add(pulse.userId);
          }
        }
        hourlySamples.push(activeUserIds.size);
      }
      if (hourlySamples.length === 0) {
        return 0;
      }
      const avg =
        hourlySamples.reduce((sum, value) => sum + value, 0) / hourlySamples.length;
      return Number(avg.toFixed(2));
    });
  }

  private countByRange(
    timestamps: Date[],
    range: { fromDate: Date; toDate: Date; bucket: 'hour' | 'day' },
  ) {
    const labels = this.buildRangeLabels(range);
    const counts = labels.map(() => 0);

    for (const timestamp of timestamps) {
      const index = this.resolveBucketIndex(timestamp, range);
      if (index >= 0 && index < counts.length) {
        counts[index] += 1;
      }
    }

    return counts;
  }

  private toTopCounts(values: string[], limit: number) {
    const counts = new Map<string, number>();
    for (const value of values) {
      const key = value && value.trim() ? value.trim() : 'Unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, limit);
  }

  private resolveBucketIndex(
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
    const dayDiff = Math.floor((eventDay - fromDay) / (24 * 60 * 60 * 1000));
    return dayDiff;
  }

  private buildRangeLabels(range: {
    fromDate: Date;
    toDate: Date;
    bucket: 'hour' | 'day';
  }) {
    if (range.bucket === 'hour') {
      return Array.from({ length: 24 }).map((_, hour) => `${hour.toString().padStart(2, '0')}:00`);
    }

    return this.getDailyBuckets(range.fromDate, range.toDate).map((bucket) =>
      `${bucket.getUTCFullYear()}-${(bucket.getUTCMonth() + 1)
        .toString()
        .padStart(2, '0')}-${bucket.getUTCDate().toString().padStart(2, '0')}`,
    );
  }

  private getHourlyBuckets(fromDate: Date, toDate: Date) {
    const start = new Date(fromDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setUTCHours(23, 59, 59, 999);

    const buckets: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      buckets.push(new Date(cursor));
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }
    return buckets;
  }

  private getDailyBuckets(fromDate: Date, toDate: Date) {
    const start = new Date(fromDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setUTCHours(23, 59, 59, 999);

    const buckets: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      buckets.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return buckets;
  }

  private resolveAnalyticsDateRange(from?: string, to?: string) {
    const parseStartOfDay = (value: string) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid analytics date range');
      }
      return date;
    };

    const parseEndOfDay = (value: string) => {
      const date = new Date(`${value}T23:59:59.999Z`);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid analytics date range');
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
      throw new BadRequestException('Invalid analytics date range');
    }

    if (fromDate.getTime() > toDate.getTime()) {
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

  private resolveFeedbackDateRange(from?: string, to?: string) {
    if (!from && !to) {
      return { fromDate: null as Date | null, toDate: null as Date | null };
    }

    const parseStartOfDay = (value: string) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid feedback date range');
      }
      return date;
    };

    const parseEndOfDay = (value: string) => {
      const date = new Date(`${value}T23:59:59.999Z`);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid feedback date range');
      }
      return date;
    };

    const parsedFrom = from ? parseStartOfDay(from) : null;
    const parsedTo = to ? parseEndOfDay(to) : null;

    let fromDate = parsedFrom;
    let toDate = parsedTo;

    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      const swappedFrom = new Date(`${to}T00:00:00.000Z`);
      const swappedTo = new Date(`${from}T23:59:59.999Z`);
      fromDate = swappedFrom;
      toDate = swappedTo;
    }

    const now = new Date();
    if (toDate && toDate.getTime() > now.getTime()) {
      toDate = now;
    }

    return { fromDate, toDate };
  }
}
