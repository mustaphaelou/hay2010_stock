import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import { getCategoryChildrenHandler } from '@/lib/api/handlers/categories-produits'

export const GET = withRateLimit(
  (request: NextRequest) => getCategoryChildrenHandler(request),
  'read'
)
