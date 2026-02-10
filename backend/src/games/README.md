# Games Module

Responsibilities
- Record games and placements.
- Calculate points and performance via `GamesScoringService`.

Inputs/Outputs
- Inputs: group id, game creation payloads, placements with ranks.
- Outputs: game records, placements with points, updated deck stats.

Invariants
- Rank configuration must be valid.
- Callers must be group members.
