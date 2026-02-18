import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type EventType =
  | 'DECK_CREATED'
  | 'DECK_DELETED'
  | 'DECK_DEACTIVATED'
  | 'DECK_REACTIVATED'
  | 'DECK_OWNER_ASSIGNED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_REMOVED'
  | 'MEMBER_PROMOTED'
  | 'MEMBER_DEMOTED'
  | 'USER_RENAMED'
  | 'USER_ACCOUNT_DELETED'
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED'
  | 'INVITE_ACCEPTED'
  | 'INVITE_REJECTED'
  | 'INVITE_CANCELED'
  | 'GAME_RECORDED'
  | 'GAME_UNDONE'
  | 'SEASON_RESET'
  | 'SEASON_UPDATED'
  | 'SEASON_STARTED'
  | 'SEASON_ENDED';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  private async cleanupExpiredEvents(groupId: string): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { historyRetentionDays: true },
    });

    if (!group?.historyRetentionDays) return;

    const cutoff = new Date(
      Date.now() - group.historyRetentionDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.groupEvent.deleteMany({
      where: {
        groupId,
        createdAt: { lt: cutoff },
      },
    });
  }

  async log(groupId: string, type: EventType, message: string): Promise<void> {
    await this.prisma.groupEvent.create({
      data: {
        groupId,
        type,
        message,
      },
    });
  }

  async getEvents(groupId: string, limit = 50) {
    await this.cleanupExpiredEvents(groupId);
    return this.prisma.groupEvent.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
