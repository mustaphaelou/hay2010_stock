import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import { listProductsHandler, createProductHandler } from '@/lib/api/handlers/produits'

export const GET = withRateLimit(
  (request: NextRequest) => listProductsHandler(request),
  'read'
)

export const POST = withRateLimit(
  (request: NextRequest) => createProductHandler(request),
  'write'
)
