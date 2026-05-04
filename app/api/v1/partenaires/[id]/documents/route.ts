import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { getPartnerDocumentsHandler } from '@/lib/api/handlers/partenaires'

export const GET = withRateLimit(
  (request: NextRequest) => getPartnerDocumentsHandler(request),
  'read'
)
