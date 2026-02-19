# Auth Pages

Responsibilities
- Login, registration, and forgot/reset password flows.
- Trigger verification email and reflect verified state in the UI.

Inputs/Outputs
- Inputs: email, password, display name, reset token.
- Outputs: `AuthService` login/register/forgot/reset and navigation.

Invariants
- Access tokens are stored in localStorage by `AuthService`.
- Email verification opens `/verify-email?token=...` and requires explicit user confirmation before redirecting to login with `verified=true`.
- Password reset uses `reset-password?token=...` route and redirects back to login on success.
