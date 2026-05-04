import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { getDocumentLinesHandler } from '@/lib/api/handlers/documents'

export const GET = withRateLimit(
  (request: NextRequest) => getDocumentLinesHandler(request),
  'read'
)
