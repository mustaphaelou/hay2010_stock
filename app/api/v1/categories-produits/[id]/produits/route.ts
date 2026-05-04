import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { getCategoryProductsHandler } from '@/lib/api/handlers/categories-produits'

export const GET = withRateLimit(
  (request: NextRequest) => getCategoryProductsHandler(request),
  'read'
)
