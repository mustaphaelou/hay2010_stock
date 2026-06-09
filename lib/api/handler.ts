import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey, requireApiRole, type ApiKeyResult } from '@/lib/api/auth'
import { apiSuccess, apiPaginated, apiCreated, apiNoContent, apiError } from '@/lib/api/response'
import { handleServiceError } from '@/lib/api/service-error'
import { ValidationError } from '@/lib/errors'
import { apiWrite } from '@/lib/actions/api-write'
import { withRateLimit, type RateLimitTier } from '@/lib/security/rate-limit'
import type { Role } from '@/lib/generated/prisma/client'
import type { ZodSchema } from 'zod'
import type { CacheInvalidation } from '@/lib/cache/invalidation'

export interface PaginationParams {
  page: number
  limit: number
  sort?: string
  order: 'asc' | 'desc'
}

export interface ApiHandlerConfig<T, Q = any, B = any> {
  auth?: 'required' | 'optional' | Role[]
  rateLimit?: RateLimitTier
  idParam?: boolean
  idErrorMessage?: string
  querySchema?: ZodSchema<Q>
  bodySchema?: ZodSchema<B>
  type?: 'read' | 'write'
  invalidations?: ((id: number | undefined, query: Q, body: B) => CacheInvalidation[]) | CacheInvalidation[]
  responseType?: 'success' | 'created' | 'noContent' | 'paginated'
  pagination?: {
    defaultSort?: string
    defaultOrder?: 'asc' | 'desc'
  }
  execute: (ctx: {
    request: NextRequest
    user: ApiKeyResult | null
    id?: number
    query: Q
    body: B
    pagination: PaginationParams
  }) => Promise<{ data?: T; meta?: any; error?: string; code?: any }>
}

export function apiHandler<T, Q = any, B = any>(config: ApiHandlerConfig<T, Q, B>) {
  const handlerFn = async (request: NextRequest, idArg?: number | string | any): Promise<NextResponse> => {
    try {
      // 1. Authentication & Authorization Check
      let user: ApiKeyResult | null = null
      const authOpt = config.auth ?? 'required'

      if (authOpt === 'optional') {
        try {
          user = await requireApiKey(request)
        } catch {
          // Proceed as guest
        }
      } else if (Array.isArray(authOpt)) {
        user = await requireApiRole(request, authOpt)
      } else {
        user = await requireApiKey(request)
      }

      // 2. ID Parameter Extraction & Validation
      let id: number | undefined = undefined
      if (config.idParam) {
        if (idArg !== undefined && idArg !== null) {
          id = typeof idArg === 'number' ? idArg : parseInt(idArg, 10)
        } else {
          const segments = request.nextUrl.pathname.split('/')
          const lastSegment = segments[segments.length - 1]
          id = parseInt(lastSegment, 10)
        }

        if (isNaN(id)) {
          throw new ValidationError(config.idErrorMessage ?? 'Invalid ID')
        }
      }

      // 3. Query Parameter Validation
      let query: Q = {} as Q
      const params: Record<string, string> = {}
      request.nextUrl.searchParams.forEach((value, key) => {
        params[key] = value
      })
      if (config.querySchema) {
        const parsed = config.querySchema.safeParse(params)
        if (!parsed.success) {
          throw new ValidationError(parsed.error.issues.map(e => e.message).join(', '))
        }
        query = parsed.data
      } else {
        query = params as unknown as Q
      }

      // 4. Request Body Validation
      let body: B = {} as B
      if (config.bodySchema || ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        let json: any = {}
        try {
          json = await request.json()
        } catch {
          if (config.bodySchema) {
            throw new ValidationError('Requête JSON invalide')
          }
        }

        if (config.bodySchema) {
          const parsed = config.bodySchema.safeParse(json)
          if (!parsed.success) {
            throw new ValidationError(parsed.error.issues.map(e => e.message).join(', '))
          }
          body = parsed.data
        } else {
          body = json
        }
      }

      // 5. Pagination Extraction
      const rawPage = params['page']
      const rawLimit = params['limit']
      const rawSort = params['sort']
      const rawOrder = params['order']

      const page = Math.max(1, parseInt(rawPage || '1', 10) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(rawLimit || '50', 10) || 50))
      const sort = rawSort || config.pagination?.defaultSort || undefined
      const defaultOrder = config.pagination?.defaultOrder || 'asc'
      const order: 'asc' | 'desc' = rawOrder?.toLowerCase() === 'desc' ? 'desc' : defaultOrder

      // 6. Execute Action (Optionally wrapped in apiWrite for mutations)
      let result: any
      if (config.type === 'write') {
        if (!user) {
          throw new ValidationError('Authentication required for write operations')
        }
        const apiUser = { id: user.userId, email: '', name: '', role: user.role }
        const resolvedInvalidations = typeof config.invalidations === 'function'
          ? config.invalidations(id, query, body)
          : config.invalidations

        result = await apiWrite(
          apiUser,
          () => config.execute({ request, user, id, query, body, pagination: { page, limit, sort, order } }),
          resolvedInvalidations
        )
      } else {
        result = await config.execute({ request, user, id, query, body, pagination: { page, limit, sort, order } })
      }

      // 6. Handle Service Error (Will throw if error is present)
      handleServiceError(result)

      // 7. Format and Return Success Response
      const responseType = config.responseType ?? 'success'
      if (responseType === 'created') {
        return apiCreated(result.data)
      } else if (responseType === 'noContent') {
        return apiNoContent()
      } else if (responseType === 'paginated') {
        return apiPaginated(result.data, result.meta)
      } else {
        return apiSuccess(result.data)
      }
    } catch (error) {
      return apiError(error)
    }
  }

  // 8. Apply rate limit wrapping dynamically if configured
  return async (request: NextRequest, idArg?: number | string | any): Promise<NextResponse> => {
    if (config.rateLimit) {
      return withRateLimit(async (req) => {
        return handlerFn(req, idArg)
      }, config.rateLimit)(request)
    }
    return handlerFn(request, idArg)
  }
}
