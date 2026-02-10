# Groups Module

Responsibilities
- Group CRUD and group configuration.
- Membership, invites, and applications.
- Season management and snapshots.

Inputs/Outputs
- Inputs: group id, user id, group settings, membership actions.
- Outputs: group DTOs, membership updates, season summaries.

Invariants
- Admin-only actions are enforced via membership checks.
- Season resets create a snapshot and reset deck stats.
