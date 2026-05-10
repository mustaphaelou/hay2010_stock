import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import {
  getProductByIdHandler,
  updateProductHandler,
  deleteProductHandler,
} from '@/lib/api/handlers/produits'

export const GET = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return getProductByIdHandler(request, id)
  },
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return updateProductHandler(request, id)
  },
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return deleteProductHandler(request, id)
  },
  'write'
)
