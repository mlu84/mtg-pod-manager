import { BadRequestException, Injectable } from '@nestjs/common';
import { GamePlacementDto } from './dto/create-game.dto';

@Injectable()
export class GamesScoringService {
  /**
   * Calculate placement points on a normalized 0-100 linear scale.
   * 1st place receives 100, last place receives 0, and intermediate positions are linear.
   * Ties share the average points of the positions they occupy.
   */
  calculatePoints(
    placements: GamePlacementDto[],
    playerCount: number,
  ): (GamePlacementDto & { points: number })[] {
    const rankGroups = new Map<number, GamePlacementDto[]>();
    for (const placement of placements) {
      if (!rankGroups.has(placement.rank)) {
        rankGroups.set(placement.rank, []);
      }
      rankGroups.get(placement.rank)!.push(placement);
    }

    // Linear scale keeps scores comparable across different player counts.
    const positionPoints = new Map<number, number>();
    for (let pos = 1; pos <= playerCount; pos++) {
      const points = ((playerCount - pos) / (playerCount - 1)) * 100;
      positionPoints.set(pos, points);
    }

    const result: (GamePlacementDto & { points: number })[] = [];
    let currentPosition = 1;

    const sortedRanks = [...rankGroups.keys()].sort((a, b) => a - b);
    for (const rank of sortedRanks) {
      const group = rankGroups.get(rank)!;
      const positionsOccupied = group.length;

      // Ties split the average of all occupied positions.
      let totalPoints = 0;
      for (let i = 0; i < positionsOccupied; i++) {
        totalPoints += positionPoints.get(currentPosition + i) || 0;
      }
      const averagePoints = totalPoints / positionsOccupied;

      for (const placement of group) {
        result.push({
          ...placement,
          points: this.roundToOneDecimal(averagePoints),
        });
      }

      currentPosition += positionsOccupied;
    }

    return result;
  }

  /**
   * Validates rank ordering rules.
   * Ranks must be integers within 1..playerCount.
   * Gaps are only allowed if they are caused by ties (e.g., ranks 1,1,3 are valid).
   */
  validateRankConfiguration(placements: GamePlacementDto[]): void {
    const playerCount = placements.length;
    const sortedRanks = placements
      .map((placement) => placement.rank)
      .sort((a, b) => a - b);

    let expectedMinRank = 1;

    for (let i = 0; i < sortedRanks.length; i++) {
      const rank = sortedRanks[i];

      if (!Number.isInteger(rank)) {
        throw new BadRequestException('Rank must be an integer');
      }

      if (rank < expectedMinRank) {
        throw new BadRequestException('Invalid rank configuration');
      }

      if (rank > playerCount) {
        throw new BadRequestException('Rank cannot exceed player count');
      }

      let tieCount = 1;
      while (i + 1 < sortedRanks.length && sortedRanks[i + 1] === rank) {
        tieCount++;
        i++;
      }
      // Move the expected rank forward by the size of the tie group.
      expectedMinRank = rank + tieCount;
    }
  }

  /**
   * Rolling average for performance after adding one new game.
   */
  calculateNewPerformance(
    currentPerformance: number,
    gamesPlayed: number,
    newPoints: number,
  ): number {
    const newPerformance =
      (currentPerformance * gamesPlayed + newPoints) / (gamesPlayed + 1);
    return this.roundToOneDecimal(newPerformance);
  }

  /**
   * Rolling average for performance after removing the most recent game.
   */
  calculatePreviousPerformance(
    currentPerformance: number,
    gamesPlayed: number,
    lastPoints: number,
  ): number {
    if (gamesPlayed <= 1) {
      return 0;
    }
    const previousPerformance =
      (currentPerformance * gamesPlayed - lastPoints) / (gamesPlayed - 1);
    return this.roundToOneDecimal(Math.max(0, previousPerformance));
  }

  /**
   * Keep one decimal place for UI consistency.
   */
  roundToOneDecimal(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
