# Auth Module

Responsibilities
- User registration, email verification, and login.
- Forgot/reset password flow with one-time reset tokens.
- Issue JWT access tokens for authenticated sessions.

Inputs/Outputs
- Inputs: signup/login/forgot/reset DTOs, verification token, reset token.
- Outputs: JWT access token, email verification state, verification redirect URL, generic forgot-password response.

Invariants
- Passwords are stored as bcrypt hashes.
- `GET /auth/verify` only redirects to frontend verify screen; token consumption happens via `POST /auth/verify`.
- Email verification requires a valid, non-expired token.
- Password reset tokens are one-time and expire after 15 minutes.
- Forgot/reset endpoints are rate-limited.
