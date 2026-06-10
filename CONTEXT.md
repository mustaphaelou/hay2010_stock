# CONTEXT.md — HAY2010 Stock App

## Domain

French-language ERP for stock, sales, purchases, partners, and affairs (affaires).
Business terms use French: `Partenaire`, `TypePartenaire`, `DocVente`, `Entrepot`, `MouvementStock`, `Affaire`.
- **`solde_courant` (current balance)**: Represents the partner's total outstanding balance. It is computed as the sum of all open (`solde_du > 0`) `DocVente` sales invoices (`Facture`, adding to the balance) minus credit notes (`Avoir`, subtracting from the balance), excluding draft (`BROUILLON`) and cancelled (`ANNULE`) documents.


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
Error strings are in French (e.g., `"Partenaire introuvable"`, `"Validation échouée"`).

Consumers (server actions, page loaders) check `result.error` before using `result.data`.
This contract is expected by `serverActionWrite` (`lib/actions/server-action-write.ts`), `apiWrite` (`lib/actions/api-write.ts`), and `loadPageData` (`lib/page-data-loader.ts`).

### 2. API Route Handlers: `throw AppError subclass`

API handlers (`lib/api/handlers/`) delegate business logic to domain services and throw typed errors:
`ValidationError`, `NotFoundError`, `AuthenticationError`, `AuthorizationError`, `ConflictError`, etc.

A handler's responsibilities are limited to three things:
1. Authenticate via `requireApiKey(request)`
2. Delegate to the appropriate domain service
3. Translate service errors to HTTP via `handleServiceError(result)`

Handlers do **not** validate input, call Prisma directly, or manage cache invalidation.
Domain services own validation, persistence, and cache lifecycle.

Centralized `handleApiError()` / `handleNextApiError()` catchers convert AppError instances
to standardized JSON responses:

```json
{ "error": "message", "code": "ERROR_CODE", "details": {}, "timestamp": "..." }
```

### 3. The Seam: `handleServiceError`

The boundary between the two idioms is `lib/api/service-error.ts` which exports
`handleServiceError(result)`. It translates service `{ error }` strings (French) into
typed `AppError` subclasses using template-based matching:

| French template in `result.error` | AppError thrown |
|-----------------------------------|-----------------|
| `"est introuvable"` / `"introuvable"` | `NotFoundError` |
| `"existe déjà"` | `ConflictError` |
| `"requis"` / `"invalide"` | `ValidationError` |

Service functions return French error strings (e.g., `"Partenaire introuvable"`,
`"Ce code produit existe déjà"`). The mapping is co-located with the API layer —
services have no knowledge of HTTP status codes or AppError subclasses.

### Deprecated

`lib/result.ts` — `Result<T,E>` monad. Fully deprecated. Use `{ data: T; error?: string }` in services and `throw AppError` in API handlers instead. Kept only for migration reference. Do not import.

**Decision date:** 2026-05-05
**Decision:** Deprecate `Result<T,E>` in favor of the two-idiom approach above.

## Stock Mutation Model

All writes to `NiveauStock` go through the stock-mutation module in `lib/stock/stock-service.ts`. There is no direct CRUD on `NiveauStock` outside this module.

### Movement Types

- **ENTREE** — stock received (purchase, return, transfer-in)
- **SORTIE** — stock removed (sale, transfer-out)
- **TRANSFERT** — atomic move from one Entrepot to another (creates two movements: SORTIE at source + ENTREE at destination)
- **INVENTAIRE** — physical inventory count adjustment

### Inventory Adjustment (Ajustement Inventaire)

When a physical count sets `quantite_en_stock` to a new absolute value, the `adjustStockLevel` function:

1. Reads current level
2. Computes `delta = newQuantity - currentQty`
3. Creates two `INVENTAIRE`-typed MouvementStock records:
   - One with `motif='Ajustement inventaire: sortie ancien stock'`
   - One with `motif='Ajustement inventaire: entrée nouveau stock'`
4. Both movements record `quantite = |delta|`
5. Sets `NiveauStock.quantite_en_stock` to the new absolute value
6. Enforces non-negative stock

If delta = 0, the adjustment is idempotent (no movements, no update).

### Initial Stock Level

`createStockLevel` initializes a `NiveauStock` row for a product-warehouse pair. If `quantite_en_stock > 0`, it also creates a single `INVENTAIRE` ENTREE movement as the initial audit record.

### Stock Level Deletion

`deleteStockLevel` performs a hard delete, only permitted when `quantite_en_stock = 0`. No movement record is created.

### Composite Key Immutability

The `id_produit` + `id_entrepot` composite key on `NiveauStock` is immutable. To move stock between warehouses, use `createStockMovement` with type `TRANSFERT`. To reassign a product, delete the old level (if qty=0) and create a new one.

### API Handler Contract

API handlers for NiveauStock (`lib/api/handlers/niveaux-stock.ts`) delegate all writes to the service module. They do not call Prisma directly or bypass the mutation invariants. Read operations (list, getById) may query Prisma directly since they carry no mutation risk.

## Architecture

See `AGENTS.md` for directory layout, commands, and conventions.
See `docs/DEVELOPER.md` for detailed setup and development guide.
