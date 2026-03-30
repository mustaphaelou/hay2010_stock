/**
 * Standard Result type for server actions
 *
 * Usage:
 * - Success: { success: true, data: someData }
 * - Error: { success: false, error: "Error message" }
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export type AsyncResult<T> = Promise<Result<T>>

/**
 * Helper functions for creating results
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data }
}

export function failure<T>(error: string): Result<T> {
  return { success: false, error }
}

/**
 * Paginated result type
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export type PaginatedResult<T> = Result<T[]> & { meta: PaginationMeta }

/**
 * Result with optional warnings
 */
export type ResultWithWarnings<T> = Result<T> & { warnings?: string[] }
