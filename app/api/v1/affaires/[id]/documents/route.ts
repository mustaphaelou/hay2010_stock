import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { getAffaireDocumentsHandler } from '@/lib/api/handlers/affaires'

export const GET = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 2], 10)
    return getAffaireDocumentsHandler(request, id)
  },
  'read'
)
