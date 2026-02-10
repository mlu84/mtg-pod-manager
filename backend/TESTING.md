# Backend Testing

This backend uses Vitest for unit tests.

Run tests:

```bash
npm run test:unit --workspace=backend
```

Approach:
1. Unit tests instantiate services directly and stub dependencies with `vi.fn`.
2. Time based logic uses `vi.useFakeTimers` and `vi.setSystemTime`.
3. Prisma is mocked with lightweight stubs (no database in unit tests).
4. If module level or integration tests are needed later, add `@nestjs/testing` and a test database setup.
