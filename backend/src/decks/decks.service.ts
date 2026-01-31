import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';

@Injectable()
export class DecksService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  async create(createDeckDto: CreateDeckDto, userId: string) {
    // Verify user is a member of the group
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: createDeckDto.groupId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    try {
      const deck = await this.prisma.deck.create({
        data: {
          name: createDeckDto.name,
          colors: createDeckDto.colors,
          type: createDeckDto.type,
          ownerId: userId,
          groupId: createDeckDto.groupId,
        },
        include: {
          owner: {
            select: {
              id: true,
              inAppName: true,
            },
          },
        },
      });

      // Log event
      await this.eventsService.log(
        createDeckDto.groupId,
        'DECK_CREATED',
        `Deck "${deck.name}" wurde von ${deck.owner.inAppName} erstellt`,
      );

      return deck;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A deck with this name already exists in the group');
      }
      throw error;
    }
  }

  async findAllInGroup(groupId: string, userId: string) {
    // Verify user is a member of the group
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const decks = await this.prisma.deck.findMany({
      where: { groupId },
      include: {
        owner: {
          select: {
            id: true,
            inAppName: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { performanceRating: 'desc' },
      ],
    });

    return decks;
  }

  async findOne(deckId: string, userId: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        owner: {
          select: {
            id: true,
            inAppName: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    // Verify user is a member of the group
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: deck.groupId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return deck;
  }

  async update(deckId: string, updateDeckDto: UpdateDeckDto, userId: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    // Check permissions: owner can edit their own deck, admin can edit any deck
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: deck.groupId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const isOwner = deck.ownerId === userId;
    const isAdmin = membership.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You can only edit your own decks');
    }

    try {
      const updatedDeck = await this.prisma.deck.update({
        where: { id: deckId },
        data: updateDeckDto,
        include: {
          owner: {
            select: {
              id: true,
              inAppName: true,
            },
          },
        },
      });

      // Log event if isActive status changed
      if (updateDeckDto.isActive !== undefined && updateDeckDto.isActive !== deck.isActive) {
        if (updateDeckDto.isActive) {
          await this.eventsService.log(
            deck.groupId,
            'DECK_REACTIVATED',
            `Deck "${updatedDeck.name}" wurde reaktiviert`,
          );
        } else {
          await this.eventsService.log(
            deck.groupId,
            'DECK_DEACTIVATED',
            `Deck "${updatedDeck.name}" wurde deaktiviert`,
          );
        }
      }

      return updatedDeck;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('A deck with this name already exists in the group');
      }
      throw error;
    }
  }

  async remove(deckId: string, userId: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    // Check permissions: owner can delete their own deck, admin can delete any deck
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: deck.groupId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const isOwner = deck.ownerId === userId;
    const isAdmin = membership.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You can only delete your own decks');
    }

    // Save deck name in game placements before deletion (for history display)
    await this.prisma.gamePlacement.updateMany({
      where: { deckId },
      data: { deletedDeckName: deck.name },
    });

    // Delete the deck (deckId in GamePlacement will be set to null via onDelete: SetNull)
    await this.prisma.deck.delete({
      where: { id: deckId },
    });

    // Log event
    await this.eventsService.log(
      deck.groupId,
      'DECK_DELETED',
      `Deck "${deck.name}" wurde gelöscht`,
    );

    return { message: 'Deck deleted successfully' };
  }
}
