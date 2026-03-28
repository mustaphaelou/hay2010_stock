import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'auth_token'

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/health',
  '/api/auth/login',
  '/api/auth/register'
]

const AUTH_API_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout'
]

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return new TextEncoder().encode(secret)
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path))
}

function isAuthApiPath(pathname: string): boolean {
  return AUTH_API_PATHS.some(path => pathname.startsWith(path))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  if (!pathname.startsWith('/api') && !pathname.startsWith('/dashboard') && 
      !pathname.startsWith('/articles') && !pathname.startsWith('/stock') && 
      !pathname.startsWith('/documents') && !pathname.startsWith('/partners') && 
      !pathname.startsWith('/affaires')) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)
    
    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.userId as string)
    response.headers.set('x-user-email', payload.email as string)
    response.headers.set('x-user-role', payload.role as string)
    
    return response
  } catch (error) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'TOKEN_INVALID' },
        { status: 401 }
      )
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/articles/:path*',
    '/stock/:path*',
    '/documents/:path*',
    '/partners/:path*',
    '/affaires/:path*',
    '/api/:path*'
  ]
}
