import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreateGameDto } from './dto/create-game.dto';
import { GroupsService } from '../groups/groups.service';
import { GamesScoringService } from './games-scoring.service';
import { GroupsMembershipService } from '../groups/groups-membership.service';

type GameDeckRef = {
  id: string;
  name: string;
  colors: string | null;
};

type GameUserRef = {
  id: string;
  inAppName: string;
};

type GamePlacementForResponse = {
  rank: number;
  points: number;
  playerName: string | null;
  deletedDeckName?: string | null;
  deck: GameDeckRef | null;
  user?: GameUserRef | null;
};

type GameForResponse = {
  id: string;
  playedAt: Date;
  playerCount: number;
  placements: GamePlacementForResponse[];
};

type DeletedDeckRef = {
  id: null;
  name: string;
  colors: null;
  isDeleted: true;
};

type FormattedGamePlacement = {
  rank: number;
  points: number;
  playerName: string | null;
  deck: GameDeckRef | DeletedDeckRef;
  user?: GameUserRef | null;
};

type FormattedGameResponse = {
  id: string;
  playedAt: Date;
  playerCount: number;
  placements: FormattedGamePlacement[];
};

@Injectable()
export class GamesService {
  constructor(
    private prisma: PrismaService,
    private eventsService: EventsService,
    private groupsService: GroupsService,
    private scoringService: GamesScoringService,
    private membershipService: GroupsMembershipService,
  ) {}

  async create(createGameDto: CreateGameDto, userId: string) {
    await this.groupsService.ensureSeasonUpToDate(createGameDto.groupId);

    await this.membershipService.ensureAdmin(
      createGameDto.groupId,
      userId,
      'Only admins can record games',
    );

    const group = await this.prisma.group.findUnique({
      where: { id: createGameDto.groupId },
      select: { seasonPauseUntil: true },
    });

    if (group?.seasonPauseUntil && new Date() < group.seasonPauseUntil) {
      throw new BadRequestException('Season is in pause. Recording games is disabled.');
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
    const deckById = new Map(decks.map((deck) => [deck.id, deck]));

    if (decks.length !== uniqueDeckIds.length) {
      throw new BadRequestException('One or more decks not found in this group');
    }

    const inactiveDecks = decks.filter((d) => !d.isActive);
    if (inactiveDecks.length > 0) {
      throw new BadRequestException(
        `Cannot use inactive decks: ${inactiveDecks.map((d) => d.name).join(', ')}`,
      );
    }

    // Validate rank configuration (tie rules, bounds)
    this.scoringService.validateRankConfiguration(createGameDto.placements);

    // Calculate points for each placement
    const playerCount = createGameDto.placements.length;
    const placementsWithPoints = this.scoringService.calculatePoints(
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
              userId: deckById.get(p.deckId)?.ownerId,
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
        const deck = deckById.get(placement.deckId);
        if (!deck) {
          throw new BadRequestException('One or more decks not found in this group');
        }
        const newPerformance = this.scoringService.calculateNewPerformance(
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
    const winnerName = winnerDeck?.deck?.name || 'Unknown';
    await this.eventsService.log(
      createGameDto.groupId,
      'GAME_RECORDED',
      `Game recorded (${playerCount} players) - Winner: ${winnerName}`,
    );

    return this.formatGameResponse(game);
  }

  async findAllInGroup(groupId: string, userId: string, limit = 20) {
    await this.membershipService.getMembershipOrThrow(userId, groupId);

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

    await this.membershipService.getMembershipOrThrow(userId, game.groupId);

    return this.formatGameResponse(game);
  }

  async undoLastGame(groupId: string, userId: string) {
    await this.membershipService.ensureAdmin(
      groupId,
      userId,
      'Only admins can undo games',
    );

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
          const previousPerformance = this.scoringService.calculatePreviousPerformance(
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
      `Last game was undone`,
    );

    return { message: 'Last game has been undone successfully' };
  }

  async getRanking(groupId: string, userId: string, snapshot = false) {
    await this.groupsService.ensureSeasonUpToDate(groupId);
    await this.membershipService.getMembershipOrThrow(userId, groupId);

    if (snapshot) {
      return this.groupsService.getLastSeasonRanking(groupId);
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
      performanceRating: this.scoringService.roundToOneDecimal(deck.performanceRating),
      gamesPlayed: deck.gamesPlayed,
      isActive: deck.isActive,
    }));
  }

  // === Helper Methods ===

  private formatGameResponse(game: GameForResponse): FormattedGameResponse {
    return {
      id: game.id,
      playedAt: game.playedAt,
      playerCount: game.playerCount,
      placements: game.placements.map((p) => {
        const deletedDeck: DeletedDeckRef = {
          id: null,
          name: p.deletedDeckName || 'Deleted Deck',
          colors: null,
          isDeleted: true,
        };

        return {
          rank: p.rank,
          points: this.scoringService.roundToOneDecimal(p.points),
          playerName: p.playerName,
          deck: p.deck ?? deletedDeck,
          user: p.user,
        };
      }),
    };
  }

}
