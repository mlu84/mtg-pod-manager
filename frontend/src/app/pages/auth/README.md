# Auth Pages

Responsibilities
- Login and registration flows.
- Trigger verification email and reflect verified state in the UI.

Inputs/Outputs
- Inputs: email, password, display name.
- Outputs: `AuthService` login/register and navigation.

Invariants
- Access tokens are stored in localStorage by `AuthService`.
- Email verification redirects to login with `verified=true`.
