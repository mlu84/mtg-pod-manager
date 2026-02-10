# Archidekt Module

Responsibilities
- Authenticated proxy to fetch deck data from Archidekt.

Inputs/Outputs
- Inputs: `GET /archidekt/decks/:id` with a numeric deck id.
- Outputs: raw Archidekt JSON or a structured error object.

Invariants
- No local persistence; requests are fetched live from Archidekt.
- Requires JWT authentication.
