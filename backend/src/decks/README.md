# Decks Module

Responsibilities
- Deck CRUD within a group.
- Integrates external deck data via `DecksArchidektService`.

Inputs/Outputs
- Inputs: group id, user id, deck metadata, optional Archidekt id.
- Outputs: deck DTOs and validation errors.

Invariants
- Callers must be group members.
- Deck stats are scoped to a group.
