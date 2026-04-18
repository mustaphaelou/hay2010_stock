/**
 * Pagination utility for server actions
 */
export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * Calculate pagination offset and limit
 */
export function getPaginationParams(params: PaginationParams): { skip: number; take: number; limit: number; page: number } {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 100))
  const skip = (page - 1) * limit
  return { skip, take: limit, limit, page }
}

/**
 * Build pagination metadata from total count
 */
export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit)
  return { page, limit, total, totalPages, hasMore: page < totalPages }
}

/**
 * Default pagination limits
 */
export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 100

export function createEmptyResult<T>(page: number = 1, limit: number = 50, error?: string): PaginatedResult<T> & { error?: string } {
  return {
    data: [],
    meta: buildPaginationMeta(0, page, limit),
    ...(error && { error })
  }
}
