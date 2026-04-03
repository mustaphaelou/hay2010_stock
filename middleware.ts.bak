import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './lib/auth/jwt'

const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password', '/register']
const PUBLIC_API_PATHS = ['/api/health', '/api/csrf-token']
const STATIC_PATHS = ['/_next', '/favicon.ico', '/public', '/images', '/fonts']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return true
  }
  if (PUBLIC_API_PATHS.some(p => pathname.startsWith(p))) {
    return true
  }
  if (STATIC_PATHS.some(p => pathname.startsWith(p))) {
    return true
  }
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const payload = await verifyToken(token)
  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('error', 'session_expired')
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('auth_token')
    return response
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-user-email', payload.email)
  requestHeaders.set('x-user-role', payload.role)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|images|fonts).*)',
  ],
}
