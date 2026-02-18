# Group Detail Page

Responsibilities
- Display group overview (header, ranking, history, stats, decks, members, winners banner).
- Orchestrate modals and actions (deck create/edit, record game, group settings, season settings, invite user, member settings).

Key Components
- `GroupHeaderComponent`, `GroupRankingCardComponent`, `GroupHistoryCardComponent`, `GroupStatsCardComponent`.
- `GroupDecksCardComponent`, `GroupMembersCardComponent`, `GroupApplicationsPanelComponent`, `GroupWinnersBannerComponent`.
- Modals: `GroupDeckCreateModalComponent`, `GroupDeckEditModalComponent`, `GroupRecordGameModalComponent`, `GroupSettingsModalComponent`, `GroupSeasonSettingsModalComponent`.

Key Utilities
- `group-detail-form-validation.ts`: centralized form/input validation for deck/game/group/season/invite flows.
- `group-detail-season-state.util.ts`: season-state helpers (active/next checks, date normalization, min-date calculation).
- `group-detail-error.util.ts`: shared API error message resolution for consistent user feedback.

Deck List Behavior
- Search filters by deck name, owner in-app name, and deck color string.
- Default sort mode is `name`.
- Sort mode `type`: alphabetical ascending by normalized deck type, `Unknown` always last.
- Sort mode `colors`: color combinations ordered from mono colors up to `WUBRG` (colorless/invalid combos after that).

Invite User Modal Behavior
- Existing-user search calls backend invitable-user search and excludes members, applicants, and already invited users.
- If a search only matches users that already have pending invites, backend returns `infoMessage`; UI shows this message instead of generic "No invitable users found."
- Search feedback block has extra spacing before the "Invite by Email" section for readability.

Winners Banner Behavior
- Desktop card order is visual `2-1-3` (silver, gold, bronze) via CSS item ordering.
- Banner includes local formatted season end date and supports per-user dismiss.

Inputs/Outputs
- Input: route param `groupId`.
- Output: API calls via `GroupDetailApiService`, UI state signals, Chart.js render.

Invariants
- Admin-only actions are gated by `isAdmin`.
- Rank configurations must be valid per `rank-utils`.
- Chart rendering requires view init and a canvas ref.
