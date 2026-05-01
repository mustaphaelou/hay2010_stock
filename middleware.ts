import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/api/auth', '/api/csrf-token', '/api/health/public', '/api/v1', '/favicon.ico', '/_next']
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

function getCorsOrigin(): string {
  return process.env.API_CORS_ORIGINS || process.env.CORS_ORIGINS || '*'
}

function addCorsHeaders(response: NextResponse, origin: string): void {
  const allowedOrigins = getCorsOrigin()
  if (allowedOrigins === '*' || allowedOrigins.split(',').map(s => s.trim()).includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigins.split(',')[0]?.trim() || '*')
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  response.headers.set('Access-Control-Max-Age', '86400')
}

function isApiV1Path(pathname: string): boolean {
  return pathname.startsWith('/api/v1')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Generate nonce for this request's CSP
  const nonce = generateNonce()

  // NOTE: Redis-based rate limiting (ioredis) cannot run in the edge runtime because
  // it depends on Node.js APIs (net, tls) not available in the edge environment.
  // Rate limiting is enforced per-route in individual API handlers instead.

  // Handle CORS preflight for /api/v1 routes
  if (isApiV1Path(pathname) && request.method === 'OPTIONS') {
    const origin = request.headers.get('origin') || '*'
    const preflightResponse = new NextResponse(null, { status: 204 })
    addCorsHeaders(preflightResponse, origin)
    return preflightResponse
  }

  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))

  const token = request.cookies.get(AUTH_COOKIE)?.value

  if (!token) {
    if (isPublicPath) {
      const response = nextWithNonce(request, nonce)
      if (isApiV1Path(pathname)) {
        const origin = request.headers.get('origin') || '*'
        addCorsHeaders(response, origin)
      }
      return response
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    addSecurityHeaders(response, nonce)
    return response
  }

  const payload = await verifyTokenEdge(token)

  if (!payload) {
    if (isPublicPath) {
      const response = nextWithNonce(request, nonce)
      if (isApiV1Path(pathname)) {
        const origin = request.headers.get('origin') || '*'
        addCorsHeaders(response, origin)
      }
      return response
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(AUTH_COOKIE)
    addSecurityHeaders(response, nonce)
    return response
  }

  if (isPublicPath && pathname !== '/favicon.ico' && !pathname.startsWith('/_next')) {
    if (isApiV1Path(pathname)) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-nonce', nonce)
      requestHeaders.set('x-user-id', payload.userId)
      requestHeaders.set('x-user-email', payload.email)
      requestHeaders.set('x-user-role', payload.role)
      const response = NextResponse.next({ request: { headers: requestHeaders } })
      addCorsHeaders(response, request.headers.get('origin') || '*')
      addSecurityHeaders(response, nonce)
      return response
    }
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

  if (isApiV1Path(pathname)) {
    addCorsHeaders(response, request.headers.get('origin') || '*')
  }

  addSecurityHeaders(response, nonce)

  return response
}

export const config = {
  matcher: [
    '/((?!api/health/public|_next/static|_next/image|favicon.ico|icon.png|images).*)',
  ],
}
