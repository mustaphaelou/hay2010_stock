import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit'
import { createCSP } from '@/lib/security/nonce'
import { randomBytes } from 'crypto'

interface JwtPayload {
  userId: string
  email: string
  role: string
  sessionId: string
  iat?: number
}

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health/public',
]

const STATIC_PATHS = [
  '/_next',
  '/favicon.ico',
  '/icon.png',
  '/images',
]

const ADMIN_PATHS = [
  '/api/admin',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    STATIC_PATHS.some(p => pathname.startsWith(p))
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some(p => pathname.startsWith(p))
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  const isDev = process.env.NODE_ENV === 'development'
  const nonce = randomBytes(16).toString('base64')
  const csp = createCSP(nonce, isDev)

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('x-nonce', nonce)

  return response
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  try {
    const rateLimitResponse = await rateLimitMiddleware(request)
    if (rateLimitResponse) {
      return addSecurityHeaders(rateLimitResponse)
    }
  } catch {
    // Continue without rate limiting if it fails
  }

  const response = NextResponse.next()
  addSecurityHeaders(response)

  if (isPublicPath(pathname)) {
    const token = request.cookies.get('auth_token')?.value
    if (token && (pathname === '/login' || pathname === '/register')) {
      try {
        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET environment variable is required')
        }
        const secret = new TextEncoder().encode(process.env.JWT_SECRET)
        await jwtVerify(token, secret)
        return NextResponse.redirect(new URL('/', request.url))
      } catch {
        // Token invalid, continue to login page
      }
    }
    return response
  }

  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required')
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret) as { payload: JwtPayload }

    response.headers.set('x-user-id', payload.userId)
    response.headers.set('x-user-email', payload.email)
    response.headers.set('x-user-role', payload.role)

    if (isAdminPath(pathname)) {
      const role = payload.role
      if (role !== 'ADMIN' && role !== 'MANAGER') {
        const errorResponse = NextResponse.json(
          { error: 'Forbidden', code: 'INSUFFICIENT_ROLE' },
          { status: 403 }
        )
        return addSecurityHeaders(errorResponse)
      }
    }

    return response
  } catch {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    redirectResponse.cookies.delete('auth_token')
    return addSecurityHeaders(redirectResponse)
  }
}

export const config = {
  matcher: [
    '/((?!api/health/public|_next/static|_next/image|favicon.ico|icon.png|images).*)',
  ],
}
