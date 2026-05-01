import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import { listPartnersHandler, createPartnerHandler } from '@/lib/api/handlers/partenaires'

export const GET = withRateLimit(
  (request: NextRequest) => listPartnersHandler(request),
  'read'
)

export const POST = withRateLimit(
  (request: NextRequest) => createPartnerHandler(request),
  'write'
)
