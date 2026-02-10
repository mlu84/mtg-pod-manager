# Events Module

Responsibilities
- Record group events for auditing and activity history.

Inputs/Outputs
- Inputs: group id, event type, human-readable message.
- Outputs: persisted event records.

Invariants
- Event creation should not change business data beyond logging.
