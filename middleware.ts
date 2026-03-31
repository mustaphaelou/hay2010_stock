import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { rateLimitMiddleware } from '@/lib/middleware/edge-rate-limit'

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return new TextEncoder().encode(secret)
}

const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/icon.png',
]

const staticExtRegex = /\.(svg|png|jpg|jpeg|gif|ico|webp|avif|css|js|map|woff|woff2|ttf|eot|json)$/i

function isPublicPath(pathname: string): boolean {
  if (staticExtRegex.test(pathname)) {
    return true
  }
  return publicPaths.some(publicPath => pathname.startsWith(publicPath))
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const rateLimitResponse = await rateLimitMiddleware(request)
  if (rateLimitResponse) {
    return addSecurityHeaders(rateLimitResponse)
  }

  if (isPublicPath(pathname)) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    return addSecurityHeaders(response)
  }

  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)

    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.userId as string)
    response.headers.set('x-user-email', payload.email as string)
    response.headers.set('x-user-role', payload.role as string)

    return addSecurityHeaders(response)
  } catch {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('auth_token')
    return addSecurityHeaders(response)
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|icon.png|login|register|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp|avif|css|js|map|woff|woff2|ttf|eot|json)$).*)',
  ],
}
