import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { getAffaireDocumentsHandler } from '@/lib/api/handlers/affaires'

export const GET = withRateLimit(
  (request: NextRequest) => getAffaireDocumentsHandler(request),
  'read'
)
