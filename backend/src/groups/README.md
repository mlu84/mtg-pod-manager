# Groups Module

Responsibilities
- Group CRUD and group configuration.
- Membership, invites, and applications.
- Season management and snapshots.

Key Services
- `GroupsQueryService`: lists groups for a user, group search, group detail payload, winners banner payload.
- `GroupsInviteService`: join by invite code and regenerate group invite code.
- `GroupsInvitationsService`: invitable-user search, user/email invite creation, incoming/sent invite lists, accept/reject/cancel flows.
- `GroupsInvitationsPolicyService`: shared invite policy checks (invitable constraints, invite receiver checks, normalized email handling).
- `GroupsApplicationsService`: group application lifecycle and conflict handling with invites.
- `groups-season.util`: extracted pure season date/time helpers (UTC day math, intervals, labels) used by `GroupsSeasonService`.
- `groups-query.mapper` + `groups-query.util`: extracted query payload mapping and pagination helpers used by `GroupsQueryService`.
- `groups-crud-season.util`: extracted season-update validation/date helpers used by `GroupsCrudService`.
- `groups-crud-season-update.util`: extracted season-update state resolution/validation flow used by `GroupsCrudService.update`.
- `common/prisma/group-delete.util`: shared transactional relation cleanup used by group deletion flows (group remove, account delete cleanup).
- `common/pipes/parse-cuid.pipe`: route/query CUID guard used by controller params.
- `common/validators/is-cuid.decorator`: DTO-level CUID validation for identifier fields in request bodies.

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
- Invalid CUID identifiers are rejected consistently at controller/DTO boundaries.
