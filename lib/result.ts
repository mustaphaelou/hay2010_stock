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

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }

  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError('BAD_REQUEST', message, 400, details)
  }

  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError('UNAUTHORIZED', message, 401)
  }

  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError('FORBIDDEN', message, 403)
  }

  static notFound(message: string = 'Not found'): AppError {
    return new AppError('NOT_FOUND', message, 404)
  }

  static conflict(message: string, details?: Record<string, unknown>): AppError {
    return new AppError('CONFLICT', message, 409, details)
  }

  static validation(message: string, details?: Record<string, unknown>): AppError {
    return new AppError('VALIDATION_ERROR', message, 422, details)
  }

  static internal(message: string = 'Internal server error'): AppError {
    return new AppError('INTERNAL_ERROR', message, 500)
  }

  static serviceUnavailable(message: string = 'Service unavailable'): AppError {
    return new AppError('SERVICE_UNAVAILABLE', message, 503)
  }

  static rateLimited(retryAfter?: number): AppError {
    return new AppError('RATE_LIMITED', 'Too many requests', 429, { retryAfter })
  }

  static csrf(): AppError {
    return new AppError('CSRF_ERROR', 'Invalid security token', 403)
  }
}

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
