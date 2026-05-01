import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/api/middleware'
import { listDocumentsHandler, createDocumentHandler } from '@/lib/api/handlers/documents'

export const GET = withRateLimit(
  (request: NextRequest) => listDocumentsHandler(request),
  'read'
)

export const POST = withRateLimit(
  (request: NextRequest) => createDocumentHandler(request),
  'write'
)
