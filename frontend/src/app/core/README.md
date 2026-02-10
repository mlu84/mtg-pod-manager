# Core Module

Responsibilities
- Cross-cutting services (auth, API, storage, error reporting).
- Guards, interceptors, and app-wide configuration.

Inputs/Outputs
- Inputs: HTTP requests, auth state, global errors.
- Outputs: Observables for API calls, auth state changes, error reports.

Invariants
- Core services own API communication and global error handling.
