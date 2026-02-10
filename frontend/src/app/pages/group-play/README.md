# Group Play Page

Responsibilities
- In-game life, poison, and commander tracking for 2-6 players.
- Draft a placement order and hand off to Group Detail for record.

Key Components
- GroupPlayPanelComponent, GroupPlaySlotComponent, GroupPlayModalsComponent.

Inputs/Outputs
- Input: route param `groupId`.
- Output: loads group decks via `GroupDetailApiService`.
- Output: stores draft in `sessionStorage` as `playGameRecordDraft` and navigates with `openRecordGame=1`.

Data Flow
- Init slots from group format (Commander starts at 40).
- End game builds placements based on elimination order and remaining life totals.

Invariants
- Deck selection is locked after the game starts.
- Max 6 slots allocated; `playerCount` controls active slots.
