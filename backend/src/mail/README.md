# Mail Module

Responsibilities
- Send transactional emails (verification + password reset).

Inputs/Outputs
- Inputs: recipient address, template data, tokens.
- Outputs: side-effect only (email delivery).

Invariants
- Uses configured mail provider settings.
- Password reset links target frontend reset route and are time-limited by backend token policy.
