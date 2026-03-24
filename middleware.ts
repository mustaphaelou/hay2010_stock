import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/favicon.ico', '/_next']
const AUTH_COOKIE = 'auth_token'
const SESSION_REFRESH_THRESHOLD = 24 * 60 * 60 * 1000
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-for-development')

async function verifyTokenEdge(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: string; email: string; role: string; sessionId: string; iat?: number }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))

  const token = request.cookies.get(AUTH_COOKIE)?.value

  if (!token) {
    if (isPublicPath) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = await verifyTokenEdge(token)

  if (!payload) {
    if (isPublicPath) {
      return NextResponse.next()
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(AUTH_COOKIE)
    return response
  }

  const tokenIssuedAt = payload.iat ? payload.iat * 1000 : Date.now()
  const shouldRefreshSession = Date.now() - tokenIssuedAt > SESSION_REFRESH_THRESHOLD

  if (isPublicPath && pathname !== '/favicon.ico' && !pathname.startsWith('/_next')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const response = NextResponse.next()
  response.headers.set('x-user-id', payload.userId)
  response.headers.set('x-user-email', payload.email)
  response.headers.set('x-user-role', payload.role)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
