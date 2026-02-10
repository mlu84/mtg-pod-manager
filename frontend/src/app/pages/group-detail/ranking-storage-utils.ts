import { toPositionMap } from './ranking-trend-utils';

export type RankingStoredState = {
  baselinePositions: Map<string, number>;
  currentPositions: Map<string, number>;
};

export function getRankingStorageKey(groupId: string): string {
  return `ranking-positions-${groupId}`;
}

export function loadRankingStoredState(
  storage: Pick<Storage, 'getItem'>,
  storageKey: string,
): RankingStoredState {
  try {
    const stored = storage.getItem(storageKey);
    if (!stored) {
      return {
        baselinePositions: new Map(),
        currentPositions: new Map(),
      };
    }
    const data = JSON.parse(stored) as {
      baseline?: Record<string, number>;
      current?: Record<string, number>;
    };
    return {
      baselinePositions: data.baseline ? toPositionMap(data.baseline) : new Map(),
      currentPositions: data.current ? toPositionMap(data.current) : new Map(),
    };
  } catch {
    return {
      baselinePositions: new Map(),
      currentPositions: new Map(),
    };
  }
}

export function saveRankingStoredState(
  storage: Pick<Storage, 'setItem'>,
  storageKey: string,
  baseline: Record<string, number>,
  current: Record<string, number>,
  timestamp: number = Date.now(),
): void {
  storage.setItem(
    storageKey,
    JSON.stringify({
      baseline,
      current,
      timestamp,
    }),
  );
}
