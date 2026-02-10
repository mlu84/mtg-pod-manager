export function isValidRankConfiguration(ranks: number[]): boolean {
  const sortedRanks = [...ranks].sort((a, b) => a - b);
  let expectedMinRank = 1;

  for (let i = 0; i < sortedRanks.length; i++) {
    const rank = sortedRanks[i];

    if (!Number.isInteger(rank)) {
      return false;
    }

    // Rank must be at least expectedMinRank (gaps are allowed for ties)
    if (rank < expectedMinRank) {
      return false;
    }

    // Rank must not exceed total player count
    if (rank > sortedRanks.length) {
      return false;
    }

    // Count ties at this rank and calculate next expected rank
    let tieCount = 1;
    while (i + 1 < sortedRanks.length && sortedRanks[i + 1] === rank) {
      tieCount++;
      i++;
    }
    expectedMinRank = rank + tieCount;
  }

  return true;
}
