import { NextResponse } from 'next/server'
import { generateCsrfToken, setCsrfCookie, ANONYMOUS_USER_ID, CSRF_COOKIE_NAME } from '@/lib/security/csrf-server'
import { verifyToken } from '@/lib/auth/jwt'
import { createLogger } from '@/lib/logger'
import { AUTH_COOKIE_NAME } from '@/lib/constants/auth'
import { cookies } from 'next/headers'

const log = createLogger('csrf-token-route')

/**
 * GET /api/csrf-token
 *
 * Generates a CSRF token for the current user.
 *
 * For authenticated users: uses their user ID as the Redis key prefix.
 * For unauthenticated users (e.g., on the login page): uses 'anonymous'.
 *
 * This endpoint MUST support unauthenticated access because the login
 * form needs a CSRF token before the user has authenticated.
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value

    let userId = ANONYMOUS_USER_ID

    if (authToken) {
      const payload = await verifyToken(authToken)
      if (payload?.userId) {
        userId = payload.userId
      }
    }

    const { token: csrfToken, cookieValue } = await generateCsrfToken(userId)

    const response = NextResponse.json({ token: csrfToken })
    response.cookies.set(CSRF_COOKIE_NAME, cookieValue, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600,
      path: '/',
    })

    return response
  } catch (error) {
    log.error({ error }, 'CSRF token generation error')
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}
