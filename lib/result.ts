/**
 * @deprecated This module is deprecated. The project uses two error idioms instead:
 *
 * 1. **Service layer**: `{ data: T; error?: string }` — functions return data with
 *    an optional error field. Consumers check `if (result.error)` before using data.
 *    Used by server actions via `executeWrite` and pages via `loadPageData`.
 *
 * 2. **API handlers**: `throw AppError subclass` — handlers throw typed errors
 *    (`ValidationError`, `NotFoundError`, etc.) caught by centralized `apiError()`
 *    middleware, which returns `{ error, code, details, timestamp }` JSON.
 *
 * @see {@link ../lib/errors.ts} for the AppError class hierarchy and API error handling.
 */

/** @deprecated Use `{ data: T; error?: string }` pattern instead. */
export type Result<T, E = Error> = Success<T> | Failure<E>

/** @deprecated Use `{ data: T; error?: string }` pattern instead. */
export interface Success<T> {
  success: true
  data: T
}

/** @deprecated Use `{ data: T; error?: string }` pattern instead. */
export interface Failure<E> {
  success: false
  error: E
}

/** @deprecated Use `{ data: T; error?: string }` pattern instead. */
export const Result = {
  ok<T>(data: T): Success<T> {
    return { success: true, data }
  },

  err<E>(error: E): Failure<E> {
    return { success: false, error }
  },

  isOk<T, E>(result: Result<T, E>): result is Success<T> {
    return result.success === true
  },

  isErr<T, E>(result: Result<T, E>): result is Failure<E> {
    return result.success === false
  },

  map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
    if (result.success) {
      return Result.ok(fn(result.data))
    }
    return result
  },

  flatMap<T, U, E>(result: Result<T, E>, fn: (data: T) => Result<U, E>): Result<U, E> {
    if (result.success) {
      return fn(result.data)
    }
    return result
  },

  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.success) {
      return result.data
    }
    return defaultValue
  },

  unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T {
    if (result.success) {
      return result.data
    }
    return fn(result.error)
  },
}

/** @deprecated Import AppError directly from `@/lib/errors` instead. */
export { AppError } from '@/lib/errors'

/** @deprecated Use `{ data: T; error?: string }` pattern with try/catch instead. */
export function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  return fn()
    .then((data) => Result.ok(data))
    .catch((error) => Result.err(error instanceof Error ? error : new Error(String(error))))
}

/** @deprecated Use `{ data: T; error?: string }` pattern with try/catch instead. */
export function trySync<T>(fn: () => T): Result<T, Error> {
  try {
    return Result.ok(fn())
  } catch (error) {
    return Result.err(error instanceof Error ? error : new Error(String(error)))
  }
}

/** @deprecated Use `{ data?: T; error?: string; success?: boolean }` pattern directly instead. */
export type ActionResult<T> = Promise<{
  success?: boolean
  data?: T
  error?: string
  code?: string
}>


/** @deprecated Import PaginationMeta and PaginatedResult directly from `@/lib/pagination` instead. */
export type { PaginationMeta, PaginatedResult } from '@/lib/pagination'

/** @deprecated Use `{ data: T; error?: string }` pattern instead. */
export type AsyncResult<T> = Promise<Result<T, string>>

/** @deprecated Use `{ data: T; error?: string; warnings?: string[] }` pattern instead. */
export type ResultWithWarnings<T> = Result<T, string> & { warnings?: string[] }
