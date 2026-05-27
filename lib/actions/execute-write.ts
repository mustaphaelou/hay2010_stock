import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import type { ZodSchema } from 'zod'
import { requirePermission, type Permission } from '@/lib/auth/authorization'
import type { CurrentUser } from '@/lib/auth/user-utils'
import { requireAuth } from '@/lib/auth/user-utils'
import { validateActionCsrf } from '@/lib/utils/action-helpers'
import { generateCsrfToken, setCsrfCookie } from '@/lib/security/csrf-server'
import { CacheInvalidationService } from '@/lib/cache/invalidation'
import { createLogger } from '@/lib/logger'

const log = createLogger('execute-write')

export type CacheInvalidation =
  | { kind: 'product'; productId?: number }
  | { kind: 'stock'; productId?: number; warehouseId?: number }
  | { kind: 'partner'; partnerId?: number }
  | { kind: 'document'; documentId?: number }
  | { kind: 'user'; userId?: string }
  | { kind: 'affaire'; affaireId?: number }
  | { kind: 'warehouse'; warehouseId?: number }
  | { kind: 'category'; categoryId?: number }
  | { kind: 'dashboard' }
  | { kind: 'all' }

export interface ExecuteWriteOptions<T> {
  permission?: Permission | 'authenticated'
  csrfToken?: string
  validation?: {
    schema: ZodSchema
    input: unknown
    message?: string
  }
  autoRotateCsrf?: boolean
  user?: CurrentUser
  writeFn: (user: CurrentUser) => Promise<T>
  invalidations?: CacheInvalidation[]
  revalidatePaths?: string[]
}

export interface ExecuteReadOptions<T> {
  permission?: Permission | 'authenticated'
  readFn: () => Promise<T>
}

async function runInvalidations(invalidations: CacheInvalidation[]): Promise<void> {
  for (const inv of invalidations) {
    switch (inv.kind) {
      case 'product':
        await CacheInvalidationService.invalidateProduct(inv.productId ?? 0)
        break
      case 'stock':
        await CacheInvalidationService.invalidateStock(inv.productId ?? 0, inv.warehouseId ?? 0)
        break
      case 'partner':
        await CacheInvalidationService.invalidatePartner(inv.partnerId ?? 0)
        break
      case 'document':
        await CacheInvalidationService.invalidateDocument(inv.documentId ?? 0)
        break
      case 'user':
        await CacheInvalidationService.invalidateUser(inv.userId ?? '')
        break
      case 'affaire':
        await CacheInvalidationService.invalidateAffaire(inv.affaireId ?? 0)
        break
      case 'warehouse':
        await CacheInvalidationService.invalidateWarehouse(inv.warehouseId ?? 0)
        break
      case 'category':
        await CacheInvalidationService.invalidateCategory(inv.categoryId ?? 0)
        break
      case 'dashboard':
        await CacheInvalidationService.invalidateDashboard()
        break
      case 'all':
        await CacheInvalidationService.invalidateAll()
        break
    }
  }
}

export async function executeRead<T>(options: ExecuteReadOptions<T>): Promise<T> {
  const { permission = 'authenticated', readFn } = options

  if (permission === 'authenticated') {
    await requireAuth()
  } else {
    await requirePermission(permission)
  }

  return readFn()
}

export async function executeWrite<T extends { error?: string }>(
  options: ExecuteWriteOptions<T>
): Promise<T | { data?: never; error: string }> {
  const {
    permission,
    csrfToken,
    validation,
    autoRotateCsrf = true,
    writeFn,
    invalidations = [],
    revalidatePaths = [],
    user: preAuthUser,
  } = options

  let user: CurrentUser | undefined = preAuthUser

  if (preAuthUser) {
    // Pre-authenticated (e.g., API key) — skip auth
  } else if (permission === undefined) {
    // No auth check — public flow (e.g., password reset)
  } else if (permission === 'authenticated') {
    user = await requireAuth()
  } else {
    user = await requirePermission(permission)
  }

  if (csrfToken) {
    const csrfUserId = user?.id ?? 'anonymous'
    const csrfError = await validateActionCsrf(csrfUserId, csrfToken)
    if (csrfError) {
      if (autoRotateCsrf) {
        try {
          const { cookieValue } = await generateCsrfToken(csrfUserId)
          await setCsrfCookie(cookieValue)
        } catch (err) {
          log.warn({ err }, 'Failed to auto-rotate CSRF token')
        }
      }
      return { error: csrfError }
    }
  }

  if (validation) {
    const result = validation.schema.safeParse(validation.input)
    if (!result.success) {
      const error = validation.message
        ?? result.error.issues.map((e) => e.message).join(', ')
      return { error }
    }
  }

  const result = await writeFn(user as CurrentUser)

  if (!result.error) {
    after(async () => {
      await runInvalidations(invalidations)
      for (const path of revalidatePaths) {
        revalidatePath(path)
      }
    })
  }

  return result
}
