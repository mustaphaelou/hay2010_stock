import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import {
  getCategoryByIdHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from '@/lib/api/handlers/categories-produits'

export const GET = withRateLimit(
  (request: NextRequest) => getCategoryByIdHandler(request),
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => updateCategoryHandler(request),
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => deleteCategoryHandler(request),
  'write'
)
