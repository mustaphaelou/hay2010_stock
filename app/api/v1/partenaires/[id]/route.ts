import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import {
  getPartnerByIdHandler,
  updatePartnerHandler,
  deletePartnerHandler,
} from '@/lib/api/handlers/partenaires'

export const GET = withRateLimit(
  (request: NextRequest) => getPartnerByIdHandler(request),
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => updatePartnerHandler(request),
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => deletePartnerHandler(request),
  'write'
)
