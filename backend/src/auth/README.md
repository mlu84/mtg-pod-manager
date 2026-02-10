# Auth Module

Responsibilities
- User registration, email verification, and login.
- Issue JWT access tokens for authenticated sessions.

Inputs/Outputs
- Inputs: signup/login DTOs, verification token.
- Outputs: JWT access token, email verification state, verification redirect URL.

Invariants
- Passwords are stored as bcrypt hashes.
- Email verification requires a valid token.
