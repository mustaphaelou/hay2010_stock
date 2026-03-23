import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth/jwt'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/favicon.ico', '/_next']
const AUTH_COOKIE = 'auth_token'

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
  
  const payload = verifyToken(token)
  
  if (!payload) {
    if (isPublicPath) {
      return NextResponse.next()
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(AUTH_COOKIE)
    return response
  }
  
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
