# Profile Settings Modal

Responsibilities
- Show current user profile inside a modal opened from the global header.
- Allow display-name edits and avatar uploads.
- Show email verification date and account metadata.
- Provide user self-deletion with explicit confirmation.

Inputs/Outputs
- Inputs: display-name edits and avatar image file uploads.
- Outputs: API calls via `UsersApiService.updateProfile`, `UsersApiService.uploadAvatar`, and `UsersApiService.deleteOwnAccount`.

Invariants
- Display name must be non-empty and at least 2 characters.
- Avatar uploads accept JPEG/PNG/WebP up to 2 MB.
- Account deletion requires a separate confirmation step.
