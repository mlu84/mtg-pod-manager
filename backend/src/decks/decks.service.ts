import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, UsersOnGroups } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { DecksArchidektService } from './decks-archidekt.service';
import { GroupsMembershipService } from '../groups/groups-membership.service';

@Injectable()
export class DecksService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private archidektService: DecksArchidektService,
    private membershipService: GroupsMembershipService,
  ) {}

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private ensureOwnerOrAdmin(
    userId: string,
    ownerId: string,
    membership: UsersOnGroups,
    forbiddenMessage: string,
  ): void {
    const isOwner = ownerId === userId;
    const isAdmin = membership.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(forbiddenMessage);
    }
  }

  async create(createDeckDto: CreateDeckDto, userId: string) {
    await this.membershipService.getMembershipOrThrow(userId, createDeckDto.groupId);

    // Handle Archidekt integration
    let archidektId: string | null = null;
    let archidektImageUrl: string | null = null;
    let archidektLastSync: Date | null = null;

    if (createDeckDto.archidektUrl) {
      archidektId = this.archidektService.extractArchidektId(createDeckDto.archidektUrl);
      if (archidektId) {
        const archidektData = await this.archidektService.fetchArchidektData(archidektId);
        if (archidektData) {
          archidektImageUrl = archidektData.imageUrl;
          archidektLastSync = new Date();
        }
      }
    }

    try {
      const deck = await this.prisma.deck.create({
        data: {
          name: createDeckDto.name,
          colors: createDeckDto.colors,
          type: createDeckDto.type,
          ownerId: userId,
          groupId: createDeckDto.groupId,
          archidektId,
          archidektImageUrl,
          archidektLastSync,
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
        `Deck "${deck.name}" was created by ${deck.owner.inAppName}`,
      );

      return deck;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A deck with this name already exists in the group');
      }
      throw error;
    }
  }

  async findAllInGroup(groupId: string, userId: string) {
    await this.membershipService.getMembershipOrThrow(userId, groupId);

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

    await this.membershipService.getMembershipOrThrow(userId, deck.groupId);

    return deck;
  }

  async update(deckId: string, updateDeckDto: UpdateDeckDto, userId: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const membership = await this.membershipService.getMembershipOrThrow(
      userId,
      deck.groupId,
    );
    this.ensureOwnerOrAdmin(
      userId,
      deck.ownerId,
      membership,
      'You can only edit your own decks',
    );

    // Handle Archidekt integration
    let archidektData: {
      archidektId?: string | null;
      archidektImageUrl?: string | null;
      archidektLastSync?: Date | null;
    } = {};

    if (updateDeckDto.archidektUrl !== undefined) {
      if (updateDeckDto.archidektUrl === '' || updateDeckDto.archidektUrl === null) {
        // Clear Archidekt link
        archidektData = {
          archidektId: null,
          archidektImageUrl: null,
          archidektLastSync: null,
        };
      } else {
        const archidektId = this.archidektService.extractArchidektId(updateDeckDto.archidektUrl);
        if (archidektId) {
          const fetchedData = await this.archidektService.fetchArchidektData(archidektId);
          archidektData = {
            archidektId,
            archidektImageUrl: fetchedData?.imageUrl || null,
            archidektLastSync: new Date(),
          };
        }
      }
    }

    // Remove archidektUrl from DTO before passing to Prisma (it's not a DB field)
    const { archidektUrl, ...prismaData } = updateDeckDto;

    try {
      const updatedDeck = await this.prisma.deck.update({
        where: { id: deckId },
        data: {
          ...prismaData,
          ...archidektData,
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

      // Log event if isActive status changed
      if (updateDeckDto.isActive !== undefined && updateDeckDto.isActive !== deck.isActive) {
        if (updateDeckDto.isActive) {
          await this.eventsService.log(
            deck.groupId,
            'DECK_REACTIVATED',
            `Deck "${updatedDeck.name}" was reactivated`,
          );
        } else {
          await this.eventsService.log(
            deck.groupId,
            'DECK_DEACTIVATED',
            `Deck "${updatedDeck.name}" was deactivated`,
          );
        }
      }

      return updatedDeck;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('A deck with this name already exists in the group');
      }
      throw error;
    }
  }

  async refreshArchidekt(deckId: string, userId: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    if (!deck.archidektId) {
      throw new ConflictException('Deck has no Archidekt link');
    }

    const membership = await this.membershipService.getMembershipOrThrow(
      userId,
      deck.groupId,
    );
    this.ensureOwnerOrAdmin(
      userId,
      deck.ownerId,
      membership,
      'You can only refresh your own decks',
    );

    const archidektData = await this.archidektService.fetchArchidektData(deck.archidektId);

    if (!archidektData) {
      throw new ConflictException('Failed to fetch data from Archidekt');
    }

    const updatedDeck = await this.prisma.deck.update({
      where: { id: deckId },
      data: {
        archidektImageUrl: archidektData.imageUrl,
        archidektLastSync: new Date(),
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

    return updatedDeck;
  }

  async remove(deckId: string, userId: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const membership = await this.membershipService.getMembershipOrThrow(
      userId,
      deck.groupId,
    );
    this.ensureOwnerOrAdmin(
      userId,
      deck.ownerId,
      membership,
      'You can only delete your own decks',
    );

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
      `Deck "${deck.name}" was deleted`,
    );

    return { message: 'Deck deleted successfully' };
  }
}
