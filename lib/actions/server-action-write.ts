import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import type { ZodSchema } from 'zod'
import { requirePermission, type Permission } from '@/lib/auth/authorization'
import type { CurrentUser } from '@/lib/auth/user-utils'
import { requireAuth } from '@/lib/auth/user-utils'
import { requireCsrfToken, getCsrfCookie, generateCsrfToken, setCsrfCookie } from '@/lib/security/csrf-server'
import { runInvalidations, type CacheInvalidation } from '@/lib/cache/invalidation'
import { validatedOrError } from '@/lib/service-result'

export type ServerActionWritePermission = Permission | 'authenticated' | 'public'

export interface ServerActionWriteOptions {
  validation?: {
    schema: ZodSchema
    input: unknown
    message?: string
  }
  invalidations?: CacheInvalidation[]
  revalidatePaths?: string[]
}

export async function serverActionWrite<T extends { error?: string }>(
  permission: ServerActionWritePermission,
  csrfToken: string | undefined,
  writeFn: (user: CurrentUser) => Promise<T>,
  options?: ServerActionWriteOptions,
): Promise<T | { error: string }> {
  let user: CurrentUser | undefined

  if (permission === 'public') {
  } else if (permission === 'authenticated') {
    user = await requireAuth()
  } else {
    user = await requirePermission(permission)
  }

  if (csrfToken) {
    const csrfUserId = user?.id ?? 'anonymous'
    try {
      const csrfCookie = await getCsrfCookie()
      await requireCsrfToken(csrfUserId, csrfToken, csrfCookie || '')
    } catch {
      try {
        const { cookieValue } = await generateCsrfToken(csrfUserId)
        await setCsrfCookie(cookieValue)
      } catch {
        // best-effort rotation
      }
      return { error: 'Jeton de sécurité invalide. Veuillez rafraîchir la page et réessayer.' }
    }
  }

  if (options?.validation) {
    const result = validatedOrError(
      options.validation.schema,
      options.validation.input,
      { joinIssues: true, message: options.validation.message },
    )
    if (result.error) {
      return { error: result.error }
    }
  }

  const result = await writeFn(user as CurrentUser)

  if (!result.error && options) {
    after(async () => {
      if (options.invalidations) {
        await runInvalidations(options.invalidations)
      }
      for (const path of options.revalidatePaths ?? []) {
        revalidatePath(path)
      }
    })
  }

  return result
}
