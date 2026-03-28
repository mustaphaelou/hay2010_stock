import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

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
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/icon.png',
]

// Static file extensions that should never be intercepted
const staticExtRegex = /\.(svg|png|jpg|jpeg|gif|ico|webp|avif|css|js|map|woff|woff2|ttf|eot|json)$/i

function isPublicPath(pathname: string): boolean {
  // Always allow static files
  if (staticExtRegex.test(pathname)) {
    return true
  }
  return publicPaths.some(publicPath => pathname.startsWith(publicPath))
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

  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)

    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.userId as string)
    response.headers.set('x-user-email', payload.email as string)
    response.headers.set('x-user-role', payload.role as string)

    return response
  } catch {
    // Token is invalid or expired - clear it and redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('auth_token')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico, icon.png (browser icons)
     * - Static file extensions
     * - login, register pages
     * - API auth & health endpoints
     */
    '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|icon.png|login|register|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp|avif|css|js|map|woff|woff2|ttf|eot|json)$).*)',
  ],
}
