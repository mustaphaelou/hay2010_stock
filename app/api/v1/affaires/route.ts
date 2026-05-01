import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import { listAffairesHandler, createAffaireHandler } from '@/lib/api/handlers/affaires'

export const GET = withRateLimit(
  (request: NextRequest) => listAffairesHandler(request),
  'read'
)

export const POST = withRateLimit(
  (request: NextRequest) => createAffaireHandler(request),
  'write'
)
