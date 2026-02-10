# Group Detail Page

Responsibilities
- Display group overview (header, ranking, history, stats, decks, members, applications).
- Orchestrate child components and modals (deck create/edit, record game, settings).

Key Components
- GroupHeaderComponent, GroupRankingCardComponent, GroupHistoryCardComponent, GroupStatsCardComponent.
- GroupDecksCardComponent, GroupMembersCardComponent, GroupApplicationsPanelComponent, GroupWinnersBannerComponent.
- Modals: GroupDeckCreateModalComponent, GroupDeckEditModalComponent, GroupRecordGameModalComponent, GroupSettingsModalComponent.

Inputs/Outputs
- Input: route param `groupId`.
- Output: API calls via `GroupDetailApiService`, UI state signals, Chart.js render.

Data Flow
- On init: load group, games, events, applications.
- Ranking uses `rank-utils` and `ranking-trend-utils` to validate and compute trends.
- Stats chart uses Chart.js and data derived from season games.

Invariants
- Admin-only actions are gated by `isAdmin`.
- Rank configurations must be valid per `rank-utils`.
- Chart rendering requires view init and a canvas ref.
