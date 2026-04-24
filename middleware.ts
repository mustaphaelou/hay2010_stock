import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit'
import { randomBytes } from 'crypto'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/api/auth', '/api/csrf-token', '/api/health/public', '/favicon.ico', '/_next']
const AUTH_COOKIE = 'auth_token'

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

function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  // In local Docker (SECURE_COOKIES=false), use unsafe-inline for compatibility
  // In production with proper nonce propagation, use nonce-based CSP
  const useUnsafeInline = isDev || process.env.SECURE_COOKIES === 'false'
  const cspHeader = `
    default-src 'self';
    script-src 'self'${useUnsafeInline ? " 'unsafe-inline' 'unsafe-eval'" : ` 'nonce-${nonce}' 'strict-dynamic'`};
    style-src 'self'${useUnsafeInline ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`};
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    connect-src 'self' https:${isDev ? ' ws: wss:' : ''};
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    object-src 'none';
  `
  return cspHeader.replace(/\s{2,}/g, ' ').trim()
}

function addSecurityHeaders(response: NextResponse, nonce: string): void {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Content-Security-Policy', buildCSP(nonce))
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Expect-CT', 'max-age=86400, enforce')
  response.headers.set('Feature-Policy', "camera 'none'; microphone 'none'; geolocation 'none'")
}

/**
 * Create a NextResponse.next() that propagates the nonce to the request headers
 * so Next.js can automatically apply it to inline scripts during SSR.
 */
function nextWithNonce(request: NextRequest, nonce: string): NextResponse {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  addSecurityHeaders(response, nonce)
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Generate nonce for this request's CSP
  const nonce = randomBytes(16).toString('base64')

  // Apply rate limiting first (except for public paths)
  try {
    const rateLimitResponse = await rateLimitMiddleware(request)
    if (rateLimitResponse) {
      addSecurityHeaders(rateLimitResponse, nonce)
      return rateLimitResponse
    }
  } catch {
    // Continue without rate limiting if it fails
  }

  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))

  const token = request.cookies.get(AUTH_COOKIE)?.value

  if (!token) {
    if (isPublicPath) {
      return nextWithNonce(request, nonce)
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    addSecurityHeaders(response, nonce)
    return response
  }

  const payload = await verifyTokenEdge(token)

  if (!payload) {
    if (isPublicPath) {
      return nextWithNonce(request, nonce)
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(AUTH_COOKIE)
    addSecurityHeaders(response, nonce)
    return response
  }

  if (isPublicPath && pathname !== '/favicon.ico' && !pathname.startsWith('/_next')) {
    const response = NextResponse.redirect(new URL('/', request.url))
    addSecurityHeaders(response, nonce)
    return response
  }

  // Authenticated request: propagate nonce + user info via request headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-user-email', payload.email)
  requestHeaders.set('x-user-role', payload.role)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // RBAC check for admin routes
  const isAdminRoute = pathname.startsWith('/api/admin')
  if (isAdminRoute && payload.role !== 'ADMIN' && payload.role !== 'MANAGER') {
    const forbiddenResponse = NextResponse.json(
      { error: 'Forbidden', code: 'INSUFFICIENT_ROLE' },
      { status: 403 }
    )
    addSecurityHeaders(forbiddenResponse, nonce)
    return forbiddenResponse
  }

  addSecurityHeaders(response, nonce)

  return response
}

export const config = {
  matcher: [
    '/((?!api/health/public|_next/static|_next/image|favicon.ico|icon.png|images).*)',
  ],
}
