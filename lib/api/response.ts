import { NextResponse } from 'next/server'
import { handleNextApiError } from '@/lib/errors'

export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function apiPaginated<T>(data: T[], meta: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean }): NextResponse {
  return NextResponse.json({ data, meta })
}

export function apiCreated<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 })
}

export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

export function apiError(error: unknown): Promise<NextResponse> {
  return handleNextApiError(error)
}
