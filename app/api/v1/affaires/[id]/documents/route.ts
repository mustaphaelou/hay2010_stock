import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import { getAffaireDocumentsHandler } from '@/lib/api/handlers/affaires'

export const GET = withRateLimit(
  (request: NextRequest) => getAffaireDocumentsHandler(request),
  'read'
)
