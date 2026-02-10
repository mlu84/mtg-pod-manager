# Archidekt Test Page

Responsibilities
- Sysadmin-only test UI for the Archidekt API via backend proxy.
- Parse and display key deck details.

Inputs/Outputs
- Inputs: Archidekt deck URL or id.
- Outputs: HTTP GET to `${apiUrl}/archidekt/decks/:id`.

Invariants
- Backend endpoint is sysadmin-protected.
- Errors are reported through `ErrorReportingService`.
