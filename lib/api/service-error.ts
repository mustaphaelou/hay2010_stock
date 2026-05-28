import { ValidationError, NotFoundError, ConflictError, BusinessError } from '@/lib/errors'
import type { ServiceErrorCode } from '@/lib/service-result'

export function handleServiceError(result: { error?: string; code?: ServiceErrorCode }): void {
  if (!result.error) return

  switch (result.code) {
    case 'NOT_FOUND':
      throw new NotFoundError(result.error)
    case 'CONFLICT':
      throw new ConflictError(result.error)
    case 'VALIDATION':
      throw new ValidationError(result.error)
    case 'LOCK_CONTENTION':
      throw new ConflictError(result.error)
    default:
      throw new BusinessError(result.error)
  }
}
