import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import { listCategoriesHandler, createCategoryHandler } from '@/lib/api/handlers/categories-produits'

export const GET = withRateLimit(
  (request: NextRequest) => listCategoriesHandler(request),
  'read'
)

export const POST = withRateLimit(
  (request: NextRequest) => createCategoryHandler(request),
  'write'
)
