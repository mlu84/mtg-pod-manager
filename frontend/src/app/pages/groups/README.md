# Groups Page

Responsibilities
- Show user groups and actions (create, join, search, applications).
- Entry point after login.

Key Utilities
- `groups-form-validation.ts`: centralized create-group/search validation for normalized text and field constraints.

Inputs/Outputs
- Inputs: search query, invite code, create form values.
- Outputs: API calls via `GroupsApiService` and `UsersApiService`.

Invariants
- Create and apply actions require verified email.
- Sysadmin-only buttons are shown via `AuthService.isSysAdmin`.
- Invalid create/search input is blocked client-side before API calls.
