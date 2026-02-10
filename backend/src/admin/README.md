# Admin Module

Responsibilities
- Admin-only group and user maintenance (search groups, rename users, delete groups/users, adjust roles).

Inputs/Outputs
- Inputs: admin HTTP requests, group/user ids, role updates.
- Outputs: group listings and status messages.

Invariants
- At least one ADMIN must remain in a group.
- SYSADMIN accounts cannot be deleted.
