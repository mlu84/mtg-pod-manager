# Groups Page

Responsibilities
- Show user groups and actions (create, join, search, applications).
- Entry point after login.

Inputs/Outputs
- Inputs: search query, invite code, create form values.
- Outputs: API calls via `GroupsApiService` and `UsersApiService`.

Invariants
- Create and apply actions require verified email.
- Sysadmin-only buttons are shown via `AuthService.isSysAdmin`.
