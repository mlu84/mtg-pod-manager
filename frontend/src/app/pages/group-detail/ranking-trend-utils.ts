import { RankingEntry, RankingEntryWithTrend } from '../../models/game.model';

export function hasRankingChanged(
  ranking: RankingEntry[],
  storedCurrentPositions: Map<string, number>,
): boolean {
  if (storedCurrentPositions.size === 0) {
    return true;
  }

  if (ranking.length !== storedCurrentPositions.size) {
    return true;
  }

  for (const entry of ranking) {
    const storedPos = storedCurrentPositions.get(entry.id);
    if (storedPos === undefined || storedPos !== entry.position) {
      return true;
    }
  }

  return false;
}

export function buildRankingWithTrends(
  ranking: RankingEntry[],
  baselinePositions: Map<string, number>,
  isFirstLoad: boolean,
): RankingEntryWithTrend[] {
  return ranking.map((entry) => {
    if (isFirstLoad) {
      return { ...entry, trend: 'same' as const, positionChange: 0 };
    }

    const baselinePosition = baselinePositions.get(entry.id);
    let trend: 'up' | 'down' | 'same' | 'new' = 'same';
    let positionChange = 0;

    if (baselinePosition === undefined) {
      trend = 'new';
    } else if (entry.position < baselinePosition) {
      trend = 'up';
      positionChange = baselinePosition - entry.position;
    } else if (entry.position > baselinePosition) {
      trend = 'down';
      positionChange = baselinePosition - entry.position;
    }

    return { ...entry, trend, positionChange };
  });
}

export function toPositionRecord(ranking: RankingEntry[]): Record<string, number> {
  const currentPositions: Record<string, number> = {};
  for (const entry of ranking) {
    currentPositions[entry.id] = entry.position;
  }
  return currentPositions;
}

export function toPositionMap(record: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(record).map(([k, v]) => [k, v as number]));
}

export function mapToPositionRecord(map: Map<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  map.forEach((pos, id) => {
    result[id] = pos;
  });
  return result;
}
