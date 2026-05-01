import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import {
  getDocumentByIdHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
} from '@/lib/api/handlers/documents'

export const GET = withRateLimit(
  (request: NextRequest) => getDocumentByIdHandler(request),
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => updateDocumentHandler(request),
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => deleteDocumentHandler(request),
  'write'
)
