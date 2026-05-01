import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import {
  getProductByIdHandler,
  updateProductHandler,
  deleteProductHandler,
} from '@/lib/api/handlers/produits'

export const GET = withRateLimit(
  (request: NextRequest) => getProductByIdHandler(request),
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => updateProductHandler(request),
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => deleteProductHandler(request),
  'write'
)
