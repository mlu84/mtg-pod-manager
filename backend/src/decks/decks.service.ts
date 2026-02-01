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

  // Archidekt Helper: Extract deck ID from URL or raw ID
  private extractArchidektId(urlOrId: string): string | null {
    if (!urlOrId || urlOrId.trim() === '') return null;

    // If it's just a number, return it
    const trimmed = urlOrId.trim();
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }

    // Extract from URL patterns like:
    // https://archidekt.com/decks/12784239/
    // https://archidekt.com/decks/12784239
    // archidekt.com/decks/12784239
    const match = trimmed.match(/decks\/(\d+)/);
    if (match) {
      return match[1];
    }

    return null;
  }

  // Archidekt Helper: Fetch deck data from Archidekt API
  private async fetchArchidektData(archidektId: string): Promise<{
    imageUrl: string | null;
    commanderName: string | null;
    colorIdentity: string[];
  } | null> {
    try {
      const response = await fetch(
        `https://archidekt.com/api/decks/${archidektId}/`,
        {
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        console.warn(`Archidekt API returned ${response.status} for deck ${archidektId}`);
        return null;
      }

      const data = await response.json();

      // Extract featured image URL
      let imageUrl: string | null = null;
      if (data.featured) {
        // featured can be a relative path or full URL
        imageUrl = data.featured.startsWith('http')
          ? data.featured
          : `https://archidekt.com${data.featured}`;
      }

      // Extract commander name(s) and color identity
      let commanderName: string | null = null;
      const colorIdentity = new Set<string>();

      if (data.cards && Array.isArray(data.cards)) {
        for (const card of data.cards) {
          // Check if card is in Commander category
          const isCommander = card.categories?.some(
            (cat: string) => cat.toLowerCase() === 'commander',
          );
          if (isCommander && card.card?.oracleCard?.name) {
            commanderName = commanderName
              ? `${commanderName} / ${card.card.oracleCard.name}`
              : card.card.oracleCard.name;
          }

          // Collect color identity from all cards
          if (card.card?.oracleCard?.colorIdentity) {
            for (const color of card.card.oracleCard.colorIdentity) {
              colorIdentity.add(color);
            }
          }
        }
      }

      return {
        imageUrl,
        commanderName,
        colorIdentity: Array.from(colorIdentity),
      };
    } catch (error) {
      console.error('Error fetching Archidekt data:', error);
      return null;
    }
  }

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

    // Handle Archidekt integration
    let archidektId: string | null = null;
    let archidektImageUrl: string | null = null;
    let archidektLastSync: Date | null = null;

    if (createDeckDto.archidektUrl) {
      archidektId = this.extractArchidektId(createDeckDto.archidektUrl);
      if (archidektId) {
        const archidektData = await this.fetchArchidektData(archidektId);
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
        const archidektId = this.extractArchidektId(updateDeckDto.archidektUrl);
        if (archidektId) {
          const fetchedData = await this.fetchArchidektData(archidektId);
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

    // Check permissions
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
      throw new ForbiddenException('You can only refresh your own decks');
    }

    const archidektData = await this.fetchArchidektData(deck.archidektId);

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
