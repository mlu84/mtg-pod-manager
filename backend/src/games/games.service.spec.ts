import { describe, expect, it } from 'vitest';
import { GamesScoringService } from './games-scoring.service';
import { GamePlacementDto } from './dto/create-game.dto';

const service = new GamesScoringService();

describe('GamesScoringService.calculatePoints', () => {
  it('assigns points for placements without ties', () => {
    const placements: GamePlacementDto[] = [
      { deckId: 'a', rank: 1 },
      { deckId: 'b', rank: 2 },
      { deckId: 'c', rank: 3 },
      { deckId: 'd', rank: 4 },
    ];

    const result = service.calculatePoints(placements, 4);

    expect(result.map((p: { points: number }) => p.points)).toEqual([100, 66.7, 33.3, 0]);
  });

  it('averages points across tied ranks', () => {
    const placements: GamePlacementDto[] = [
      { deckId: 'a', rank: 1 },
      { deckId: 'b', rank: 2 },
      { deckId: 'c', rank: 2 },
    ];

    const result = service.calculatePoints(placements, 3);

    expect(result.map((p: { points: number }) => p.points)).toEqual([100, 25, 25]);
  });
});

describe('GamesScoringService.validateRankConfiguration', () => {
  it('accepts valid tie configuration', () => {
    const placements: GamePlacementDto[] = [
      { deckId: 'a', rank: 1 },
      { deckId: 'b', rank: 1 },
      { deckId: 'c', rank: 3 },
    ];

    expect(() => service.validateRankConfiguration(placements)).not.toThrow();
  });

  it('accepts gaps when ranks stay within player count', () => {
    const placements: GamePlacementDto[] = [
      { deckId: 'a', rank: 1 },
      { deckId: 'b', rank: 3 },
      { deckId: 'c', rank: 3 },
    ];

    expect(() => service.validateRankConfiguration(placements)).not.toThrow();
  });

  it('rejects invalid tie ordering', () => {
    const placements: GamePlacementDto[] = [
      { deckId: 'a', rank: 1 },
      { deckId: 'b', rank: 1 },
      { deckId: 'c', rank: 2 },
    ];

    expect(() => service.validateRankConfiguration(placements)).toThrow();
  });

  it('rejects ranks beyond player count', () => {
    const placements: GamePlacementDto[] = [
      { deckId: 'a', rank: 1 },
      { deckId: 'b', rank: 2 },
      { deckId: 'c', rank: 4 },
    ];

    expect(() => service.validateRankConfiguration(placements)).toThrow(
      'Rank cannot exceed player count',
    );
  });

  it('rejects non-integer ranks', () => {
    const placements: GamePlacementDto[] = [
      { deckId: 'a', rank: 1 },
      { deckId: 'b', rank: 2.5 },
      { deckId: 'c', rank: 3 },
    ];

    expect(() => service.validateRankConfiguration(placements)).toThrow(
      'Rank must be an integer',
    );
  });
});
