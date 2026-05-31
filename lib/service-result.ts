import type { ZodType } from 'zod'

export type ServiceErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'LOCK_CONTENTION' | 'INTERNAL'

export type ServiceResult<T> =
  | { data: T; error?: undefined; code?: undefined }
  | { data?: undefined; error: string; code: ServiceErrorCode }

export function serviceError(message: string, code: ServiceErrorCode): { error: string; code: ServiceErrorCode } {
  return { error: message, code }
}

export function isServiceError<T>(result: ServiceResult<T>): result is { data?: undefined; error: string; code: ServiceErrorCode } {
  return 'error' in result && typeof result.error === 'string'
}

export function validatedOrError<T>(
  schema: ZodType<T>,
  input: unknown,
  options?: { message?: string; joinIssues?: boolean },
): ServiceResult<T> {
  const result = schema.safeParse(input)
  if (result.success) {
    return { data: result.data }
  }
  const message = options?.message
    ?? (options?.joinIssues
      ? result.error.issues.map((e) => e.message).join(', ')
      : 'Validation échouée')
  return { error: message, code: 'VALIDATION' }
}
