# Groups Module

Responsibilities
- Group CRUD and group configuration.
- Membership, invites, and applications.
- Season management and snapshots.

Key Services
- `GroupsQueryService`: lists groups for a user, group search, group detail payload, winners banner payload.
- `GroupsInviteService`: join by invite code and regenerate group invite code.
- `GroupsInvitationsService`: invitable-user search, user/email invite creation, incoming/sent invite lists, accept/reject/cancel flows.
- `GroupsApplicationsService`: group application lifecycle and conflict handling with invites.

Inputs/Outputs
- Inputs: group id, user id, group settings, membership actions.
- Outputs: group DTOs, membership updates, season summaries.

Invariants
- Admin-only actions are enforced via membership checks.
- Season resets create a snapshot and reset deck stats.
- Invite/application conflicts are blocked consistently (no duplicate pending invite, no invite for open applicant, no invite for existing member).
- Invite identity checks use normalized email (`trim().toLowerCase()`).
- Invitable-user search may return `items: []` with an info message when matches already have pending invites.
- Joining via invite code and accepting an invite clean up matching pending invites by user id and email.
