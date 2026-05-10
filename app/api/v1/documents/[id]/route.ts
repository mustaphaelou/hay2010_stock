import { NextRequest } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limit'
import {
  getDocumentByIdHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
} from '@/lib/api/handlers/documents'

export const GET = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return getDocumentByIdHandler(request, id)
  },
  'read'
)

export const PUT = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return updateDocumentHandler(request, id)
  },
  'write'
)

export const DELETE = withRateLimit(
  (request: NextRequest) => {
    const segments = request.nextUrl.pathname.split('/')
    const id = parseInt(segments[segments.length - 1], 10)
    return deleteDocumentHandler(request, id)
  },
  'write'
)
