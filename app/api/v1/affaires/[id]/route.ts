import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import {
  getAffaireByIdHandler,
  updateAffaireHandler,
  deleteAffaireHandler,
} from '@/lib/api/handlers/affaires'

export const GET = withRateLimit(
  (request: NextRequest) => getAffaireByIdHandler(request),
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => updateAffaireHandler(request),
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => deleteAffaireHandler(request),
  'write'
)
