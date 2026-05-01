import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import { getCategoryProductsHandler } from '@/lib/api/handlers/categories-produits'

export const GET = withRateLimit(
  (request: NextRequest) => getCategoryProductsHandler(request),
  'read'
)
