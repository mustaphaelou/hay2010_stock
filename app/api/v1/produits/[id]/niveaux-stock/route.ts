import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import { getProductStockLevelsHandler } from '@/lib/api/handlers/produits'

export const GET = withRateLimit(
  (request: NextRequest) => getProductStockLevelsHandler(request),
  'read'
)
