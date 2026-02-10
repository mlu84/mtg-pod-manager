# Sysadmin Users Page

Responsibilities
- Sysadmin-only user and group administration.
- Search groups, rename users, change roles, remove members, delete users/groups.

Inputs/Outputs
- Inputs: search query, member actions.
- Outputs: API calls via `AdminApiService`.

Invariants
- Requires sysadmin access (route guard).
- Destructive actions require confirmation modal.
