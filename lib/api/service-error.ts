import { ValidationError, NotFoundError, ConflictError, BusinessError } from '@/lib/errors'

export function handleServiceError(result: { error?: string }): void {
  if (!result.error) return

  const msg = result.error

  if (msg.includes('introuvable') || msg.includes('est introuvable'))
    throw new NotFoundError(msg)
  if (msg.includes('existe déjà'))
    throw new ConflictError(msg)
  if (msg.includes('requis') || msg.includes('invalide'))
    throw new ValidationError(msg)

  throw new BusinessError(msg)
}
