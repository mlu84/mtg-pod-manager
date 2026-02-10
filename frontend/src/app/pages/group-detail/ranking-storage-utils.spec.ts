import { describe, expect, it } from 'vitest';
import {
  getRankingStorageKey,
  loadRankingStoredState,
  saveRankingStoredState,
} from './ranking-storage-utils';

function createMemoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

describe('ranking-storage-utils', () => {
  it('builds storage key from group id', () => {
    expect(getRankingStorageKey('abc')).toBe('ranking-positions-abc');
  });

  it('loads empty maps when storage has no value', () => {
    const storage = createMemoryStorage();
    const result = loadRankingStoredState(storage, 'k');
    expect(result.baselinePositions.size).toBe(0);
    expect(result.currentPositions.size).toBe(0);
  });

  it('saves and reloads ranking state', () => {
    const storage = createMemoryStorage();
    saveRankingStoredState(storage, 'k', { a: 1 }, { b: 2 }, 123);
    const result = loadRankingStoredState(storage, 'k');
    expect(result.baselinePositions.get('a')).toBe(1);
    expect(result.currentPositions.get('b')).toBe(2);
  });
});
