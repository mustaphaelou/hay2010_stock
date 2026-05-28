# ADR-0004: API Request Orchestrator

**Date:** 2026-05-29

## Context

API route handlers across 7 distinct domain modules duplicated identical boilerplate code for request parsing, numeric ID extraction, query validation, body validation, authentication key retrieval, role checks, `apiWrite` orchestration (for caching invalidation/transactions), error handling via `handleServiceError()`, rate limiting wrapping, and JSON response serialization. This resulted in:
1. Low code locality: API plumbing was scattered and copy-pasted across 7 files.
2. Low interface leverage: Changes to error mapping, API key checks, or rate limiting required manual modifications across dozens of handler functions.
3. Boilerplate overhead: Over 600 lines of code were dedicated to standard HTTP lifecycle mechanics rather than business logic execution.

## Decision

Introduce a deep `apiHandler` request orchestrator module (`lib/api/handler.ts`) that exposes a declarative configuration schema.

1. **Declarative Configuration**: Define handlers using options objects containing `auth`, `rateLimit`, `idParam`, Zod validators (`querySchema`, `bodySchema`), write transactions (`type: 'write'`, `invalidations`), and response formatting (`responseType`).
2. **Dynamic Inward Wrapping**: The orchestrator handles parameters parsing, rate limiting wrapping, and authentication checks dynamically in the request context, allowing Next.js routes under `app/api/v1/*/route.ts` to be simple, single-line exports.
3. **Traceability**: All exceptions/errors (including validation, authentication, conflicts) are automatically mapped to Next.js API responses, preserving existing HTTP schemas and error response signatures.

## Alternatives considered

- **Fluent / Middleware Chains**: Rejected because fluent builder APIs (`apiHandler().auth().execute()`) require more code structure, are harder to type-check cleanly in TypeScript, and do not align with the codebase's existing options-bag config style (e.g. `serverActionWrite`).
- **Decorators / HOFs**: Rejected because higher-order decorators still require manual parameter extraction and `handleServiceError` calls inside the handlers, which fails to minimize boilerplates.

## Consequences

- 7 handlers are reduced to declarative configs, removing 600+ lines of duplicated code.
- Route files under `app/api/v1/` are simplified to re-exports, decoupling Next.js routing structures from handler execution.
- Integration tests can call orchestrator-produced handler functions directly since they accept an optional second argument fallback for test parameter injection.
