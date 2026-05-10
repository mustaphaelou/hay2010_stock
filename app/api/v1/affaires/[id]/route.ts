import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import {
  getAffaireByIdHandler,
  updateAffaireHandler,
  deleteAffaireHandler,
} from '@/lib/api/handlers/affaires'

export const GET = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return getAffaireByIdHandler(request, id)
  },
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return updateAffaireHandler(request, id)
  },
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return deleteAffaireHandler(request, id)
  },
  'write'
)
