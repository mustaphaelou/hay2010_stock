import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth/jwt'
import { getSession } from './lib/auth/session'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth']
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
    const response = isPublicPath 
      ? NextResponse.next() 
      : NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(AUTH_COOKIE)
    return response
  }
  
  const session = await getSession(payload.sessionId)
  
  if (!session) {
    const response = isPublicPath 
      ? NextResponse.next() 
      : NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(AUTH_COOKIE)
    return response
  }
  
  if (isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  const response = NextResponse.next()
  response.headers.set('x-user-id', session.userId)
  response.headers.set('x-user-email', session.email)
  response.headers.set('x-user-role', session.role)
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
