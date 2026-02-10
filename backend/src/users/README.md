# Users Module

Responsibilities
- User creation, lookup, and profile updates.
- Email verification token management.

Inputs/Outputs
- Inputs: user data, query params (email/id), verification token.
- Outputs: user records and status messages.

Invariants
- Email and inAppName uniqueness are enforced at the DB layer.
