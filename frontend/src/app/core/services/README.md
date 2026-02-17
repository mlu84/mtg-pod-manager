# Core Services

Responsibilities
- API clients for admin, groups, group detail, and users.
- Auth token management and sysadmin detection.
- Error reporting and global error handling.

Inputs/Outputs
- Inputs: HTTP requests, tokens, errors.
- Outputs: Observables for API calls and error reports.

Invariants
- API clients use `environment.apiUrl`.
- Errors should route through `ErrorReportingService` or `GlobalErrorHandler`.
- User profile API includes avatar upload support via multipart requests.
- User profile API includes authenticated self-deletion via `DELETE /users/me`.
