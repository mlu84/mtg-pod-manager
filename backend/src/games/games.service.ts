import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateGameDto, GamePlacementDto } from './dto/create-game.dto';

@Injectable()
export class GamesService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
  ) {}

  async create(createGameDto: CreateGameDto, userId: string) {
    // Verify user is admin of the group
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: createGameDto.groupId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can record games');
    }

    // Validate all decks exist, are active, and belong to the group
    const deckIds = createGameDto.placements.map((p) => p.deckId);
    const uniqueDeckIds = [...new Set(deckIds)];

    if (uniqueDeckIds.length !== deckIds.length) {
      throw new BadRequestException('Each deck can only appear once per game');
    }

    const decks = await this.prisma.deck.findMany({
      where: {
        id: { in: uniqueDeckIds },
        groupId: createGameDto.groupId,
      },
    });

    if (decks.length !== uniqueDeckIds.length) {
      throw new BadRequestException('One or more decks not found in this group');
    }

    const inactiveDecks = decks.filter((d) => !d.isActive);
    if (inactiveDecks.length > 0) {
      throw new BadRequestException(
        `Cannot use inactive decks: ${inactiveDecks.map((d) => d.name).join(', ')}`,
      );
    }

    // Calculate points for each placement
    const playerCount = createGameDto.placements.length;
    const placementsWithPoints = this.calculatePoints(
      createGameDto.placements,
      playerCount,
    );

    // Create game and placements in a transaction
    const game = await this.prisma.$transaction(async (tx) => {
      // Create the game
      const newGame = await tx.game.create({
        data: {
          groupId: createGameDto.groupId,
          playerCount,
          playedAt: createGameDto.playedAt
            ? new Date(createGameDto.playedAt)
            : new Date(),
          placements: {
            create: placementsWithPoints.map((p) => ({
              deckId: p.deckId,
              rank: p.rank,
              points: p.points,
              playerName: p.playerName,
              userId: decks.find((d) => d.id === p.deckId)?.ownerId,
            })),
          },
        },
        include: {
          placements: {
            include: {
              deck: {
                select: {
                  id: true,
                  name: true,
                  colors: true,
                },
              },
            },
            orderBy: {
              rank: 'asc',
            },
          },
        },
      });

      // Update performance ratings for each deck
      for (const placement of placementsWithPoints) {
        const deck = decks.find((d) => d.id === placement.deckId)!;
        const newPerformance = this.calculateNewPerformance(
          deck.performanceRating,
          deck.gamesPlayed,
          placement.points,
        );

        await tx.deck.update({
          where: { id: placement.deckId },
          data: {
            performanceRating: newPerformance,
            gamesPlayed: { increment: 1 },
          },
        });
      }

      return newGame;
    });

    // Log event
    const winnerDeck = game.placements.find((p) => p.rank === 1);
    const winnerName = winnerDeck?.deck?.name || 'Unbekannt';
    await this.eventsService.log(
      createGameDto.groupId,
      'GAME_RECORDED',
      `Spiel erfasst (${playerCount} Spieler) - Sieger: ${winnerName}`,
    );

    return this.formatGameResponse(game);
  }

  async findAllInGroup(groupId: string, userId: string, limit = 20) {
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

    const games = await this.prisma.game.findMany({
      where: { groupId },
      include: {
        placements: {
          select: {
            id: true,
            rank: true,
            points: true,
            playerName: true,
            deletedDeckName: true,
            deck: {
              select: {
                id: true,
                name: true,
                colors: true,
              },
            },
          },
          orderBy: {
            rank: 'asc',
          },
        },
      },
      orderBy: {
        playedAt: 'desc',
      },
      take: limit,
    });

    return games.map((game) => this.formatGameResponse(game));
  }

  async findOne(gameId: string, userId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        placements: {
          select: {
            id: true,
            rank: true,
            points: true,
            playerName: true,
            deletedDeckName: true,
            deck: {
              select: {
                id: true,
                name: true,
                colors: true,
              },
            },
            user: {
              select: {
                id: true,
                inAppName: true,
              },
            },
          },
          orderBy: {
            rank: 'asc',
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Verify user is a member of the group
    const membership = await this.prisma.usersOnGroups.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: game.groupId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return this.formatGameResponse(game);
  }

  async undoLastGame(groupId: string, userId: string) {
    // Verify user is admin of the group
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

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can undo games');
    }

    // Find the last game
    const lastGame = await this.prisma.game.findFirst({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        placements: {
          include: {
            deck: true,
          },
        },
      },
    });

    if (!lastGame) {
      throw new NotFoundException('No games found to undo');
    }

    // Revert performance ratings in a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const placement of lastGame.placements) {
        const deck = placement.deck;
        // Only update deck stats if the deck still exists (wasn't deleted)
        if (deck) {
          const previousPerformance = this.calculatePreviousPerformance(
            deck.performanceRating,
            deck.gamesPlayed,
            placement.points,
          );

          await tx.deck.update({
            where: { id: deck.id },
            data: {
              performanceRating: previousPerformance,
              gamesPlayed: { decrement: 1 },
            },
          });
        }
      }

      // Delete placements first (due to foreign key)
      await tx.gamePlacement.deleteMany({
        where: { gameId: lastGame.id },
      });

      // Delete the game
      await tx.game.delete({
        where: { id: lastGame.id },
      });
    });

    // Log event
    await this.eventsService.log(
      groupId,
      'GAME_UNDONE',
      `Letztes Spiel wurde rückgängig gemacht`,
    );

    return { message: 'Last game has been undone successfully' };
  }

  async getRanking(groupId: string, userId: string) {
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
        { performanceRating: 'desc' },
        { gamesPlayed: 'desc' },
      ],
    });

    return decks.map((deck, index) => ({
      position: index + 1,
      id: deck.id,
      name: deck.name,
      colors: deck.colors,
      type: deck.type,
      owner: deck.owner,
      performanceRating: this.roundToOneDecimal(deck.performanceRating),
      gamesPlayed: deck.gamesPlayed,
      isActive: deck.isActive,
    }));
  }

  // === Helper Methods ===

  private calculatePoints(
    placements: GamePlacementDto[],
    playerCount: number,
  ): (GamePlacementDto & { points: number })[] {
    // Group placements by rank to handle ties
    const rankGroups = new Map<number, GamePlacementDto[]>();
    for (const p of placements) {
      if (!rankGroups.has(p.rank)) {
        rankGroups.set(p.rank, []);
      }
      rankGroups.get(p.rank)!.push(p);
    }

    // Calculate base points for each position
    // Formula: ((playerCount - position) / (playerCount - 1)) * 100
    const positionPoints = new Map<number, number>();
    for (let pos = 1; pos <= playerCount; pos++) {
      const points = ((playerCount - pos) / (playerCount - 1)) * 100;
      positionPoints.set(pos, points);
    }

    // For tied ranks, calculate average of the positions they occupy
    const result: (GamePlacementDto & { points: number })[] = [];
    let currentPosition = 1;

    const sortedRanks = [...rankGroups.keys()].sort((a, b) => a - b);
    for (const rank of sortedRanks) {
      const group = rankGroups.get(rank)!;
      const positionsOccupied = group.length;

      // Sum points for all positions this tied group occupies
      let totalPoints = 0;
      for (let i = 0; i < positionsOccupied; i++) {
        totalPoints += positionPoints.get(currentPosition + i) || 0;
      }
      const averagePoints = totalPoints / positionsOccupied;

      for (const p of group) {
        result.push({
          ...p,
          points: this.roundToOneDecimal(averagePoints),
        });
      }

      currentPosition += positionsOccupied;
    }

    return result;
  }

  private calculateNewPerformance(
    currentPerformance: number,
    gamesPlayed: number,
    newPoints: number,
  ): number {
    // Formula: (currentPerformance * gamesPlayed + newPoints) / (gamesPlayed + 1)
    const newPerformance =
      (currentPerformance * gamesPlayed + newPoints) / (gamesPlayed + 1);
    return this.roundToOneDecimal(newPerformance);
  }

  private calculatePreviousPerformance(
    currentPerformance: number,
    gamesPlayed: number,
    lastPoints: number,
  ): number {
    // Reverse the formula to get previous performance
    if (gamesPlayed <= 1) {
      return 0;
    }
    const previousPerformance =
      (currentPerformance * gamesPlayed - lastPoints) / (gamesPlayed - 1);
    return this.roundToOneDecimal(Math.max(0, previousPerformance));
  }

  private roundToOneDecimal(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private formatGameResponse(game: any) {
    return {
      id: game.id,
      playedAt: game.playedAt,
      playerCount: game.playerCount,
      placements: game.placements.map((p: any) => ({
        rank: p.rank,
        points: this.roundToOneDecimal(p.points),
        playerName: p.playerName,
        deck: p.deck || {
          id: null,
          name: p.deletedDeckName || 'Deleted Deck',
          colors: null,
          isDeleted: true,
        },
        user: p.user,
      })),
    };
  }
}
