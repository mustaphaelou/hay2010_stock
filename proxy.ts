import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/api/health/public', '/favicon.ico', '/_next']
const AUTH_COOKIE = 'auth_token'
const SESSION_REFRESH_THRESHOLD = 24 * 60 * 60 * 1000

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return new TextEncoder().encode(secret)
}

async function verifyTokenEdge(token: string) {
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload as { userId: string; email: string; role: string; sessionId: string; iat?: number }
  } catch {
    return null
  }
}

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Content-Security-Policy',
    process.env.NODE_ENV === 'development'
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https: ws: wss:; frame-ancestors 'none';"
      : "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';"
  )
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  
  // Add Expect-CT header for certificate transparency
  response.headers.set('Expect-CT', 'max-age=86400, enforce')
  
  // Add Feature-Policy header (legacy, kept for compatibility)
  response.headers.set('Feature-Policy', "camera 'none'; microphone 'none'; geolocation 'none'")
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply rate limiting first (except for public paths)
  const rateLimitResponse = await rateLimitMiddleware(request)
  if (rateLimitResponse) {
    addSecurityHeaders(rateLimitResponse)
    return rateLimitResponse
  }

  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))

  const token = request.cookies.get(AUTH_COOKIE)?.value

  if (!token) {
    if (isPublicPath) {
      const response = NextResponse.next()
      addSecurityHeaders(response)
      return response
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    addSecurityHeaders(response)
    return response
  }

  const payload = await verifyTokenEdge(token)

  if (!payload) {
    if (isPublicPath) {
      const response = NextResponse.next()
      addSecurityHeaders(response)
      return response
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(AUTH_COOKIE)
    addSecurityHeaders(response)
    return response
  }

	const tokenIssuedAt = payload.iat ? payload.iat * 1000 : Date.now()
	// Session refresh logic placeholder - currently unused but kept for future implementation
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _shouldRefreshSession = Date.now() - tokenIssuedAt > SESSION_REFRESH_THRESHOLD

  if (isPublicPath && pathname !== '/favicon.ico' && !pathname.startsWith('/_next')) {
    const response = NextResponse.redirect(new URL('/', request.url))
    addSecurityHeaders(response)
    return response
  }

const response = NextResponse.next()
  response.headers.set('x-user-id', payload.userId)
  response.headers.set('x-user-email', payload.email)
  response.headers.set('x-user-role', payload.role)

  // RBAC check for admin routes
  const isAdminRoute = pathname.startsWith('/api/admin')
  if (isAdminRoute && payload.role !== 'ADMIN') {
    const forbiddenResponse = NextResponse.json(
      { error: 'Forbidden', code: 'INSUFFICIENT_ROLE' },
      { status: 403 }
    )
    addSecurityHeaders(forbiddenResponse)
    return forbiddenResponse
  }

  addSecurityHeaders(response)

  return response
}
