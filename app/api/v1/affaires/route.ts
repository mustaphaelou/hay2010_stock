import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { listAffairesHandler, createAffaireHandler } from '@/lib/api/handlers/affaires'

export const GET = withRateLimit(
  (request: NextRequest) => listAffairesHandler(request),
  'read'
)

export const POST = withRateLimit(
  (request: NextRequest) => createAffaireHandler(request),
  'write'
)
