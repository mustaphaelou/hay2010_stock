# CONTEXT.md — HAY2010 Stock App

## Domain

French-language ERP for stock, sales, purchases, partners, and affairs (affaires).
Business terms use French: `Partenaire`, `TypePartenaire`, `DocVente`, `Entrepot`, `MouvementStock`, `Affaire`.

## Error Handling Idioms

This project uses **two distinct error handling patterns**, each chosen for its layer:

### 1. Service Layer: `{ data: T; error?: string }`

Every service function in `lib/stock/`, `lib/partners/`, `lib/documents/`, `lib/affaires/`,
`lib/dashboard/`, and `lib/auth/` returns a consistent contract:

```ts
// Success
{ data: items, error: undefined }
// Failure
{ data: [], error: 'message' }
// or
{ data: someValue, error: 'message' }
```

Service functions **never throw** for business-logic failures (validation, not-found, permission denied).
They catch infrastructure exceptions internally and return `{ error: message }`.

Consumers (server actions, page loaders) check `result.error` before using `result.data`.
This contract is expected by `executeWrite` (`lib/actions/execute-write.ts`) and `loadPageData` (`lib/page-data-loader.ts`).

### 2. API Route Handlers: `throw AppError subclass`

API handlers (`app/api/`, `lib/api/handlers/`) validate input and throw typed errors:
`ValidationError`, `NotFoundError`, `AuthenticationError`, `AuthorizationError`, `ConflictError`, etc.

Centralized `handleApiError()` / `handleNextApiError()` catchers convert AppError instances
to standardized JSON responses:

```json
{ "error": "message", "code": "ERROR_CODE", "details": {}, "timestamp": "..." }
```

### Deprecated

`lib/result.ts` — `Result<T,E>` monad. Fully deprecated. Use `{ data: T; error?: string }` in services and `throw AppError` in API handlers instead. Kept only for migration reference. Do not import.

**Decision date:** 2026-05-05
**Decision:** Deprecate `Result<T,E>` in favor of the two-idiom approach above.

## Architecture

See `AGENTS.md` for directory layout, commands, and conventions.
See `docs/DEVELOPER.md` for detailed setup and development guide.
