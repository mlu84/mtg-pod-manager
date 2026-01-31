import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type EventType =
  | 'DECK_CREATED'
  | 'DECK_DELETED'
  | 'DECK_DEACTIVATED'
  | 'DECK_REACTIVATED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_REMOVED'
  | 'GAME_RECORDED'
  | 'GAME_UNDONE';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.groupEvent.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
