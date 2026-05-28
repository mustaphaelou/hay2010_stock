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
