export type Result<T, E = Error> = Success<T> | Failure<E>

export interface Success<T> {
  success: true
  data: T
}

export interface Failure<E> {
  success: false
  error: E
}

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

export { AppError } from '@/lib/errors'

export function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  return fn()
    .then((data) => Result.ok(data))
    .catch((error) => Result.err(error instanceof Error ? error : new Error(String(error))))
}

export function trySync<T>(fn: () => T): Result<T, Error> {
  try {
    return Result.ok(fn())
  } catch (error) {
    return Result.err(error instanceof Error ? error : new Error(String(error)))
  }
}

export type ActionResult<T> = Promise<{
  success?: boolean
  data?: T
  error?: string
  code?: string
}>


export type { PaginationMeta, PaginatedResult } from '@/lib/pagination'

export type AsyncResult<T> = Promise<Result<T, string>>

export type ResultWithWarnings<T> = Result<T, string> & { warnings?: string[] }
