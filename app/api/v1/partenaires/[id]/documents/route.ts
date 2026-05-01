import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import { getPartnerDocumentsHandler } from '@/lib/api/handlers/partenaires'

export const GET = withRateLimit(
  (request: NextRequest) => getPartnerDocumentsHandler(request),
  'read'
)
