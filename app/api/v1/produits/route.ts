import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { listProductsHandler, createProductHandler } from '@/lib/api/handlers/produits'

export const GET = withRateLimit(
  (request: NextRequest) => listProductsHandler(request),
  'read'
)

export const POST = withRateLimit(
  (request: NextRequest) => createProductHandler(request),
  'write'
)
