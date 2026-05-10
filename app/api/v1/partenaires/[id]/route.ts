import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import {
  getPartnerByIdHandler,
  updatePartnerHandler,
  deletePartnerHandler,
} from '@/lib/api/handlers/partenaires'

export const GET = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return getPartnerByIdHandler(request, id)
  },
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return updatePartnerHandler(request, id)
  },
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return deletePartnerHandler(request, id)
  },
  'write'
)
