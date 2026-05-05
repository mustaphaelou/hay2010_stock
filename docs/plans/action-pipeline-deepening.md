# Action Pipeline Deepening + Auth/Validation Cleanup

## Summary

Three coordinated changes that deepen the server action write pipeline into a single seam (`executeWrite` / `executeRead`), consolidate duplicated authorization checks, and eliminate validation schema duplication.

The deepening: `lib/actions/execute-write.ts` — a module that bundles auth + CSRF + Zod validation + cache invalidation + path revalidation into one call. The auth and validation fixes are cleanup that the deepening enables.

**Total impact**: ~180 lines of duplicated boilerplate deleted across 7 action files. 5 files with inline auth checks standardized. Duplicate schemas eliminated. 12 existing test files survive unchanged.

---

## Target 1: `lib/actions/execute-write.ts` (new module)

### Interface

```ts
import type { CurrentUser } from '@/lib/auth/user-utils'
import type { Permission } from '@/lib/auth/authorization'
import type { ZodSchema } from 'zod'

export interface ExecuteWriteOptions<T> {
  permission?: Permission | 'authenticated'
  csrfToken?: string
  validation?: {
    schema: ZodSchema
    input: unknown
    message?: string
  }
  autoRotateCsrf?: boolean   // default true
  writeFn: (user: CurrentUser) => Promise<T>
  invalidations?: CacheInvalidation[]
  revalidatePaths?: string[]
}

export interface ExecuteReadOptions<T> {
  permission?: Permission | 'authenticated'
  readFn: () => Promise<T>
}

// For reads: only auth. No CSRF, no invalidation.
export async function executeRead<T>(options: ExecuteReadOptions<T>): Promise<T>

// For writes: auth + optional CSRF + optional Zod validation + invalidation + revalidation.
export async function executeWrite<T extends { error?: string }>(
  options: ExecuteWriteOptions<T>
): Promise<T | { error: string }>
```

### Error convention

| Error type | Behavior |
|------------|----------|
| Auth/permission failure | **Throws** (caller never receives error object) |
| CSRF failure | **Returns** `{ error: string }` (user-actionable) |
| Validation failure | **Returns** `{ error: string }` (user-actionable) |
| Business errors | **Propagates** (writeFn can throw or return `{ error }`) |

### Implementation logic (pseudocode)

```
executeWrite(options):
  1. Resolve user via requirePermission(options.permission)
     - If permission === 'authenticated', use requireAuth()
     - Otherwise, use requirePermission(permission)
  2. If csrfToken provided:
     - Validate via validateActionCsrf(user.id, csrfToken)
     - On failure: if autoRotateCsrf, generate + set new token, then return { error }
  3. If validation provided:
     - schema.safeParse(input)
     - On failure: return { error: validation.message || formatted issues }
  4. Call writeFn(user)
  5. If result has no .error:
     - after(() => { run invalidations; revalidatePaths })
  6. Return result
```

### Auth resolution detail

`executeWrite` needs to resolve `CurrentUser` internally. It must:
- Import `requirePermission` and `requireAuth` from `@/lib/auth/authorization`
- `permission: 'authenticated'` → call `requireAuth()` (resolves user without permission check)
- `permission: Permission` → call `requirePermission(permission)`
- Default (not provided): `'authenticated'`

### CSRF handling detail

- Use `validateActionCsrf` from `@/lib/utils/action-helpers.ts` (the existing 10-line helper)
- When `autoRotateCsrf: true` (default) and CSRF fails: import `generateCsrfToken` and `setCsrfCookie` from `@/lib/security/csrf-server`, generate a new token, set the cookie, then return the error
- This covers `auth.ts:login()`'s existing `refreshCsrfForClient()` behavior

### Cache invalidation type

Keep the `CacheInvalidation` type from `lib/stock/stock-write.ts` but move it to `lib/cache/invalidation.ts` or define it in `execute-write.ts`:

```ts
export type CacheInvalidation =
  | { kind: 'product'; productId: number }
  | { kind: 'stock'; productId: number; warehouseId: number }
  | { kind: 'partner'; partnerId: number }
  | { kind: 'document'; documentId: number }
  | { kind: 'user'; userId: string }
  | { kind: 'affaire'; affaireId: number }
  | { kind: 'warehouse'; warehouseId: number }
  | { kind: 'category'; categoryId: number }
  | { kind: 'dashboard' }
  | { kind: 'all' }
```

The invalidation dispatch in the `after()` block:

```ts
for (const inv of invalidations) {
  switch (inv.kind) {
    case 'product': await CacheInvalidationService.invalidateProduct(inv.productId); break
    case 'stock': await CacheInvalidationService.invalidateStock(inv.productId, inv.warehouseId); break
    case 'partner': await CacheInvalidationService.invalidatePartner(inv.partnerId); break
    case 'document': await CacheInvalidationService.invalidateDocument(inv.documentId); break
    case 'user': await CacheInvalidationService.invalidateUser(inv.userId); break
    case 'affaire': await CacheInvalidationService.invalidateAffaire(inv.affaireId); break
    case 'warehouse': await CacheInvalidationService.invalidateWarehouse(inv.warehouseId); break
    case 'category': await CacheInvalidationService.invalidateCategory(inv.categoryId); break
    case 'dashboard': await CacheInvalidationService.invalidateDashboard(); break
    case 'all': await CacheInvalidationService.invalidateAll(); break
  }
}
```

---

## Target 2: `lib/stock/stock-write.ts` — backward-compatible adapter

After the new module exists, `stock-write.ts` becomes:

```ts
import { executeWrite, type ExecuteWriteOptions, type CacheInvalidation } from '@/lib/actions/execute-write'
import type { Permission } from '@/lib/auth/authorization'

export type { CacheInvalidation }

export interface StockWriteOptions<T> {
  permission?: Permission
  csrfToken: string
  writeFn: (user: { id: string; email: string; name: string; role: string }) => Promise<T>
  invalidations?: CacheInvalidation[]
  revalidatePaths?: string[]
}

export async function executeStockWrite<T extends { error?: string }>(
  options: StockWriteOptions<T>
): Promise<T> {
  return executeWrite(options) as Promise<T>
}
```

The cast is safe because `ExecuteWriteOptions<T>` is a superset of `StockWriteOptions<T>` — the only difference is the `user` type in `writeFn`, which is structurally compatible with `CurrentUser`.

**IMPORTANT**: Test this thoroughly. The `writeFn` in `StockWriteOptions` takes `{ id, email, name, role }` but `executeWrite` passes a `CurrentUser`. Verify the types are structurally compatible. If not, add a simple mapping.

---

## Target 3: Action files — replace inline boilerplate with `executeWrite`/`executeRead`

### 3a. `app/actions/auth.ts`

**Current CSRF block in login() (lines ~):**
```ts
const csrfCookie = await getCsrfCookie()
const valid = await validateCsrfToken(ANONYMOUS_USER_ID, csrfToken, csrfCookie || '')
if (!valid) {
  refreshCsrfForClient()
  return { error: 'Jeton de sécurité invalide. Veuillez rafraîchir la page et réessayer.' }
}
```

**Current Zod block in login():**
```ts
const validation = loginSchema.safeParse({ email, password })
if (!validation.success) {
  return { error: validation.error.issues.map(e => e.message).join(', ') }
}
```

**Current try/catch in login():**
```ts
try {
  // ... all logic ...
} catch (error) {
  log.error({ error, email }, 'Login action error')
  after(() => Sentry.captureException(error))
  return { error: 'Une erreur inattendue est survenue...' }
}
```

**After — login():**
```ts
export async function login(email: string, password: string, rememberMe: boolean, csrfToken: string) {
  return executeWrite({
    csrfToken,
    validation: { schema: loginSchema, input: { email, password } },
    writeFn: async () => {
      // Step 1: rate-limit / lockout checks (stay inline — they need prisma + redis directly)
      const ipResult = await isLockedByIp()
      if (ipResult.locked) return { error: ipResult.message }
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
      if (!user) return { error: 'Email ou mot de passe incorrect' }
      const lockoutResult = await isAccountLocked(user.id)
      if (lockoutResult.locked) return { error: lockoutResult.message }
      // Step 2: verify password
      const validPassword = await verifyPassword(password, user.password_hash)
      if (!validPassword) {
        await recordFailedAttempt(user.id)
        await recordFailedAttemptByIp()
        const remaining = await getRemainingAttempts(user.id)
        return { error: `Email ou mot de passe incorrect. ${remaining} tentative(s) restante(s)` }
      }
      // Step 3: clear lockout, generate token, create session
      await clearFailedAttempts(user.id)
      await clearFailedAttemptsByIp()
      const token = await generateToken({ userId: user.id, email: user.email, role: user.role })
      const sessionData = await createSession(user.id, token, rememberMe)
      setCookie('auth_token', token, { httpOnly: true, secure: ..., sameSite: 'lax', maxAge: ... })
      return { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } }
    }
  })
}
```

**After — logout():**
```ts
export async function logout(csrfToken: string) {
  return executeWrite({
    csrfToken,
    writeFn: async (user) => {
      // Read token from cookie, revoke, delete session, clear cookie
      const token = cookies().get('auth_token')?.value
      if (token) try { await revokeToken(token) } catch { /* ignore */ }
      await deleteSession(user.id)
      cookies().delete('auth_token')
      return { success: true }
    }
  })
}
```

The `getCurrentUser()` import can be removed — `executeWrite` resolves the user internally.

**Remove these imports:** `validateCsrfToken`, `getCsrfCookie`, `ANONYMOUS_USER_ID`, `generateCsrfToken`, `setCsrfCookie` (CSRF is now handled by `executeWrite`). Keep: `prisma`, `verifyPassword`, `generateToken`, `createSession`, `deleteSession`, `revokeToken`, `loginSchema`, `lockout` functions, `logger`, `cookies`, `after`.

### 3b. `app/actions/profile.ts`

**Current (simplified):**
```ts
export async function updateProfile(formData: FormData) {
  // ... extract fields ...
  const user = await requireAuth()
  const csrfCookie = await getCsrfCookie()
  const valid = await validateCsrfToken(user.id, csrfToken, csrfCookie || '')
  if (!valid) return { error: 'Jeton invalide...' }
  const validation = updateProfileSchema.safeParse(...)
  if (!validation.success) return { error: ... }
  try {
    // ... update logic ...
  } catch (error) {
    log.error(...)
    after(() => Sentry.captureException(error))
    return { error: 'Une erreur inattendue...' }
  }
}
```

**After:**
```ts
export async function updateProfile(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const currentPassword = (formData.get('currentPassword') as string) || undefined
  const csrfToken = (formData.get('csrfToken') as string) || ''
  return executeWrite({
    csrfToken,
    validation: { schema: updateProfileSchema, input: { name, email, currentPassword } },
    writeFn: async (user) => {
      // verify current password if provided
      if (currentPassword) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
        if (!dbUser) return { error: 'Utilisateur introuvable' }
        const validPassword = await verifyPassword(currentPassword, dbUser.password_hash)
        if (!validPassword) return { error: 'Mot de passe actuel incorrect' }
      }
      await prisma.user.update({ where: { id: user.id }, data: { name, email } })
      return { success: true }
    }
  })
}
```

**Remove imports:** `validateCsrfToken`, `getCsrfCookie`, `after`, `Sentry` (Sentry wrapping is now `executeWrite`'s concern or removed — see note). Keep: `prisma`, `requireAuth` (if `getUserProfile` still uses it), `verifyPassword`, `updateProfileSchema`, `logger`.

**Note on Sentry**: The `executeWrite` module should optionally wrap the writeFn in `after(() => Sentry.captureException(...))` if Sentry is available. Alternatively, remove Sentry from individual actions and handle it at the framework level. For this plan: ignore Sentry wrapping in `executeWrite` — actions that previously had it can keep a thin try/catch in their writeFn. It's not worth complicating the pipeline for a non-critical observability concern.

### 3c. `app/actions/registration.ts`

**After:**
```ts
export async function publicRegister(email: string, password: string, name: string, csrfToken: string) {
  return executeWrite({
    csrfToken,
    validation: { schema: registerSchema, input: { email, password, name } },
    writeFn: async () => {
      // Rate limiting stays inline (IP-based, uses raw redis)
      if (isRedisReady()) {
        const ipKey = `register:ratelimit:${ /* derive IP */ }`
        const count = await redis.incr(ipKey)
        if (count === 1) await redis.expire(ipKey, 3600)
        if (count > 5) return { error: 'Trop de tentatives...' }
      }
      // Check existing user
      const normalizedEmail = email.toLowerCase().trim()
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
      if (existing) return { error: 'Un compte existe déjà avec cet email' }
      // Create user
      const passwordHash = await hashPassword(password)
      await prisma.user.create({ data: { email: normalizedEmail, password_hash: passwordHash, name, role: 'VIEWER' } })
      return { success: true }
    }
  })
}
```

### 3d. `app/actions/password-reset.ts`

**After** for `resetPassword()`:
```ts
export async function resetPassword(token: string, newPassword: string) {
  return executeWrite({
    permission: 'authenticated', // not really — but we want the validation without CSRF
    // Actually: no CSRF needed. The token IS the auth.
    // Use executeWrite without csrfToken:
    validation: { schema: passwordSchema, input: { password: newPassword } },
    writeFn: async () => {
      const payload = await validateResetToken(token)
      if (!payload || !payload.userId) return { error: 'Token invalide ou expiré' }
      const passwordHash = await hashPassword(newPassword)
      await prisma.user.update({ where: { id: payload.userId }, data: { password_hash: passwordHash } })
      await consumeResetToken(token)
      return { success: true }
    }
  })
}
```

Wait — `resetPassword` is a public endpoint with no auth. The token provides auth. So `permission` should be optional and default to no auth check:

**Decision**: `executeWrite` with no `permission` and no `csrfToken` → no auth check, no CSRF → just run the writeFn. This handles the password-reset flow.

Update the `executeWrite` logic:
- `permission` defaults to `undefined` (not `'authenticated'`)
- When `permission` is `undefined`: skip auth check entirely
- When `permission` is `'authenticated'`: call `requireAuth()`
- When `permission` is a Permission string: call `requirePermission(permission)`

This is better — public flows (password reset, registration) don't need auth in the pipeline.

### 3e. `app/actions/articles.ts`

**Current:**
```ts
export async function toggleArticleStatus(id_produit: number, newStatus: boolean, csrfToken: string) {
  return executeStockWrite({
    csrfToken,
    writeFn: (user) => toggleArticleStatus(id_produit, newStatus, user),
    invalidations: [{ kind: 'product', productId: id_produit }],
    revalidatePaths: ['/articles']
  })
}
```

**After** — just switch import:
```ts
import { executeWrite, type CacheInvalidation } from '@/lib/actions/execute-write'

export async function toggleArticleStatus(id_produit: number, newStatus: boolean, csrfToken: string) {
  return executeWrite({
    permission: 'stock:write',
    csrfToken,
    writeFn: (user) => toggleArticleStatus(id_produit, newStatus, user),
    invalidations: [{ kind: 'product', productId: id_produit }],
    revalidatePaths: ['/articles']
  })
}
```

### 3f. `app/actions/stock-movement.ts`

Same pattern as `articles.ts` — switch `executeStockWrite` → `executeWrite`.

### 3g. `app/actions/api-keys.ts`

**Current pattern repeated 3 times:**
```ts
const user = await getCurrentUser()
if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
  throw new Error('Unauthorized')
}
```

**After — `createApiKey()`:**
```ts
export async function createApiKey(name: string) {
  const user = await requirePermission('users:write')
  const { rawKey, prefix, hash } = generateKey()
  const apiKey = await prisma.apiKey.create({
    data: {
      userId: user.id,
      name,
      keyPrefix: prefix,
      keyHash: hash,
      role: user.role as Role,
    }
  })
  return { id: apiKey.id, name: apiKey.name, keyPrefix: apiKey.keyPrefix, rawKey }
}
```

**After — `listApiKeys()`:**
```ts
export async function listApiKeys() {
  await requirePermission('users:read')
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } }
  })
  return keys
}
```

**After — `revokeApiKey()`:**
```ts
export async function revokeApiKey(id: string) {
  await requirePermission('users:write')
  await prisma.apiKey.update({ where: { id }, data: { isActive: false } })
  return { success: true }
}
```

**Remove import:** `getCurrentUser` → add `requirePermission` from `@/lib/auth/authorization`.

---

## Target 4: Authorization scattered checks — standardize

### 4a. `app/api/health/route.ts`

Read this file first to understand the exact JWT verification pattern, then replace with `requireAuth()` or `requirePermission('reports:view')`.

Likely change:
```ts
// Before:
const token = request.cookies.get('auth_token')?.value
if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const payload = await verifyToken(token)
if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'MANAGER')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// After:
await requirePermission('reports:view')
```

Wait — `requirePermission` throws on failure. The API route needs to catch it and return JSON. Check if there's a wrapper for this (`handleApiError` from `@/lib/errors`).

**Decision**: Keep the handler wrapped in try/catch. If `requirePermission` throws `AuthError` or `Forbidden`, catch it and return appropriate JSON via `apiError()`.

Actually — health route uses `NextResponse.json()` directly, not `apiError`. Read the full file before changing.

### 4b. `app/api/invoices/[id]/route.ts`

**Likely before:**
```ts
const token = request.cookies.get('auth_token')?.value
const payload = await verifyToken(token)
if (!payload) return error response
if (payload.role !== 'ADMIN' && payload.role !== 'MANAGER' && doc.cree_par !== payload.userId) {
  return error response
}
```

**After:**
```ts
const user = await requireAuth()
if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && doc.cree_par !== user.id) {
  return error response
}
```

The ownership check `doc.cree_par !== user.id` stays — it's business logic, not authorization enforcement.

### 4c. `lib/documents/document-service.ts`

**Before:**
```ts
if (user.role === 'ADMIN') { /* show all */ }
```

**After:**
```ts
import { hasRole } from '@/lib/auth/authorization'
if (hasRole(user.role, 'ADMIN')) { /* show all */ }
```

---

## Target 5: Validation schema consolidation

### 5a. `lib/validation.ts`

Delete the duplicate definitions of `passwordSchema`, `loginSchema`, `registerSchema`, `LoginInput`, `RegisterInput`. Replace with re-exports:

```ts
import { z } from 'zod'

// Re-export auth schemas from canonical location
export { passwordSchema, loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@/lib/auth/validation'

// Pagination schema — canonical definition lives in lib/pagination.ts
import { paginationSchema } from '@/lib/pagination'
export { paginationSchema }
export type PaginationInput = z.infer<typeof paginationSchema>

// Re-export domain validators
export { toggleArticleStatusSchema, createMovementSchema, type ToggleArticleStatusInput, type CreateMovementInput } from '@/lib/stock/validation'
export { getDocLinesSchema, getDocumentsByAffaireSchema, type GetDocLinesInput, type GetDocumentsByAffaireInput } from '@/lib/documents/validation'
export { getPartnersSchema, type GetPartnersInput } from '@/lib/partners/validation'
```

### 5b. `lib/pagination.ts`

Add the canonical `paginationSchema`:

```ts
import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
```

Note `z.coerce.number()` — handles string query params from `searchParams`. Check existing usage to ensure compatibility. If the existing schema uses `z.number()`, keep that for server action usage and add a separate `paginationQuerySchema` for API handlers. Or better: make the canonical schema use `z.coerce` and verify all callers work.

### 5c. `lib/api/validators/produits.ts`

Replace the inline `paginationSchema` with an import:

```ts
import { paginationSchema } from '@/lib/pagination'
```

Delete the local `paginationSchema` definition (if it exists).

**Check all 7 API validators** for local pagination schema definitions — consolidate all of them.

---

## Target 6: Read the files before editing

Before modifying ANY file, read it fully to understand:
1. The exact import structure
2. Which functions are used vs. which can be removed
3. The exact error format returned to callers
4. Whether any exported types are relied upon by downstream modules

**Files to read before editing:**
- `app/actions/auth.ts` (full)
- `app/actions/profile.ts` (full)
- `app/actions/registration.ts` (full)
- `app/actions/password-reset.ts` (full)
- `app/actions/articles.ts` (full)
- `app/actions/stock-movement.ts` (full)
- `app/actions/api-keys.ts` (full)
- `app/api/health/route.ts` (full)
- `app/api/invoices/[id]/route.ts` (full)
- `lib/documents/document-service.ts` (full)
- `lib/stock/stock-write.ts` (full)
- `lib/validation.ts` (full)
- `lib/auth/validation.ts` (full)
- `lib/pagination.ts` (full)
- `lib/api/validators/*.ts` (all 7 — check for paginationSchema duplication)
- `lib/cache/invalidation.ts` (full — for CacheInvalidationService API)
- `lib/utils/action-helpers.ts` (full)
- `lib/auth/authorization.ts` (full)
- `lib/auth/user-utils.ts` (full)
- `lib/security/csrf-server.ts` (full — understand generateCsrfToken, setCsrfCookie API)
- `lib/security/csrf-client.ts` (full — understand getCsrfToken)

---

## Target 7: Test survival

### Test files list
```
src/__tests__/app/actions/auth.test.ts          (249 lines, 11 tests)
src/__tests__/app/actions/profile.test.ts        (224 lines, 10 tests)
src/__tests__/app/actions/registration.test.ts   (173 lines, 8 tests)
src/__tests__/app/actions/password-reset.test.ts (159 lines, 10 tests)
src/__tests__/app/actions/articles.test.ts       (216 lines, 8 tests)
src/__tests__/app/actions/stock-movement.test.ts (143 lines, 4 tests)
src/__tests__/app/actions/documents.test.ts      (177 lines, 7 tests)
src/__tests__/app/actions/partners.test.ts       (152 lines, 7 tests)
src/__tests__/app/actions/dashboard.test.ts      (124 lines, 4 tests)
src/__tests__/app/actions/dashboard-data.test.ts (142 lines, 5 tests)
src/__tests__/app/actions/affaires.test.ts       (120 lines, 6 tests)
src/__tests__/app/actions/stock.test.ts          (178 lines, 8 tests)
```

### What needs to change in tests

**Tests that mock `executeStockWrite`** (`articles.test.ts`, `stock-movement.test.ts`):
These mock `@/lib/stock/stock-write` today. After the refactor:
- `articles.test.ts` and `stock-movement.test.ts` should mock `@/lib/actions/execute-write` instead
- `executeStockWrite` in these tests currently resolves to `vi.fn().mockResolvedValue({ success: true })` — the replacement `executeWrite` mock will do the same

**Tests that mock `validateCsrfToken`, `getCsrfCookie`** (`auth.test.ts`, `profile.test.ts`, `registration.test.ts`):
These mock `@/lib/security/csrf-server` and test CSRF failure paths. After the refactor:
- CSRF is tested inside `executeWrite` (via `validateActionCsrf`)
- These tests should mock `@/lib/actions/execute-write` and test that `executeWrite` is called with the right options
- OR: keep mocking `csrf-server` but now `executeWrite` is the one calling it — the test needs to verify that `executeWrite` passes through the CSRF result

**Decision**: Write a dedicated test file for `execute-write.ts` (`src/__tests__/lib/actions/execute-write.test.ts`) that covers:
- Auth success / failure
- CSRF validation success / failure (with auto-rotation)
- Zod validation success / failure
- writeFn success / error propagation
- Invalidation dispatch
- Path revalidation

Then the action tests mock `executeWrite` and focus on verifying it's called with the correct options — they become simpler.

### Test for `execute-write.ts` test plan

```ts
describe('executeWrite', () => {
  it('resolves user via requirePermission when permission is a Permission string')
  it('resolves user via requireAuth when permission is "authenticated"')
  it('skips auth when permission is undefined')
  it('validates CSRF when csrfToken is provided')
  it('skips CSRF when csrfToken is undefined')
  it('auto-rotates CSRF token on validation failure')
  it('returns { error } on CSRF validation failure')
  it('validates with Zod when validation is provided')
  it('returns { error } on Zod validation failure with default message')
  it('returns { error } on Zod validation failure with custom message')
  it('executes writeFn and returns result on success')
  it('propagates thrown errors from writeFn')
  it('returns { error } from writeFn when writeFn returns error')
  it('dispatches cache invalidations in after()')
  it('revalidates paths in after()')
  it('skips invalidation/revalidation when writeFn returns error')
})

describe('executeRead', () => {
  it('resolves user with requirePermission')
  it('resolves user with requireAuth')
  it('executes readFn and returns result')
  it('propagates errors from readFn')
})
```

---

## Execution order

```
Step 1: Read prerequisite files (see Target 6 list)
Step 2: Create lib/actions/execute-write.ts
Step 3: Create src/__tests__/lib/actions/execute-write.test.ts
Step 4: Update lib/stock/stock-write.ts (adapter)
Step 5: Update lib/validation.ts (delete dups, add re-exports)
Step 6: Update lib/pagination.ts (add paginationSchema)
Step 7: Update lib/api/validators/*.ts (import centralized paginationSchema)
Step 8: Update lib/documents/document-service.ts (hasRole)
Step 9: Update app/actions/auth.ts (executeWrite)
Step 10: Update app/actions/profile.ts (executeWrite)
Step 11: Update app/actions/registration.ts (executeWrite)
Step 12: Update app/actions/password-reset.ts (executeWrite)
Step 13: Update app/actions/articles.ts (executeStockWrite → executeWrite)
Step 14: Update app/actions/stock-movement.ts (same)
Step 15: Update app/actions/api-keys.ts (requirePermission)
Step 16: Update app/api/health/route.ts (requirePermission)
Step 17: Update app/api/invoices/[id]/route.ts (requireAuth)
Step 18: Update action test files (mock executeWrite instead of old imports)
Step 19: Run npm run lint && npx tsc --noEmit
Step 20: Run npm run test:all
Step 21: Fix any test failures
```

---

## Verification checklist

After all changes:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run lint` passes
- [ ] `npm run test:all` passes — all 12 action test files + new execute-write tests
- [ ] `npm run dev` starts without runtime errors
- [ ] Login flow works: submit login form → authenticated
- [ ] Logout flow works
- [ ] Profile update works
- [ ] Registration works (including CSRF refresh on failure)
- [ ] Password reset works
- [ ] Article status toggle works
- [ ] Stock movement creation works
- [ ] API key CRUD works
- [ ] Health endpoint still returns correct data
- [ ] Invoice PDF download still works with auth
- [ ] `lib/stock/stock-write.ts` re-exports are backward compatible (if any direct consumers exist beyond articles/stock-movement actions)
