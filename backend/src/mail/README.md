# Mail Module

Responsibilities
- Send transactional emails (verification + password reset).
- Validate provider responses and process Resend delivery webhooks.

Inputs/Outputs
- Inputs: recipient address, template data, tokens.
- Outputs: side-effect only (email delivery).

Invariants
- Uses configured mail provider settings.
- Mail send operations must fail if provider returns an explicit API error.
- Sender domain health is checked against the configured Resend account at startup.
- Password reset links target frontend reset route and are time-limited by backend token policy.
