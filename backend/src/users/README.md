# Users Module

Responsibilities
- User creation, lookup, profile updates, and avatar uploads.
- User self-deletion with group cleanup and admin handover rules.
- Email verification token management.

Inputs/Outputs
- Inputs: user data, query params (email/id), verification token, avatar image files.
- Outputs: user profile records (including `avatarUrl`) and status messages.

Invariants
- Email and inAppName uniqueness are enforced at the DB layer.
- Avatar uploads accept only JPEG/PNG/WebP up to 2 MB.
- Sysadmin accounts cannot be deleted through the normal user flow.
