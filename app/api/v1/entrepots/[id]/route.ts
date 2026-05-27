import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import {
  getWarehouseByIdHandler,
  updateWarehouseHandler,
  deleteWarehouseHandler,
} from '@/lib/api/handlers/entrepots'

export const GET = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return getWarehouseByIdHandler(request, id)
  },
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return updateWarehouseHandler(request, id)
  },
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return deleteWarehouseHandler(request, id)
  },
  'write'
)
