'use server'

import { cookies, headers } from 'next/headers'
import { after } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { generateToken, verifyToken, revokeToken } from '@/lib/auth/jwt'
import { createSession, deleteSession } from '@/lib/auth/session'
import { loginSchema } from '@/lib/auth/validation'
import { recordFailedAttempt, clearFailedAttempts, isAccountLocked, isLockedByIp, recordFailedAttemptByIp, clearFailedAttemptsByIp } from '@/lib/auth/lockout'
import { validateCsrfToken, getCsrfCookie, ANONYMOUS_USER_ID, generateCsrfToken, setCsrfCookie } from '@/lib/security/csrf-server'
import { createLogger } from '@/lib/logger'
import { AUTH_COOKIE_NAME } from '@/lib/constants/auth'
import * as Sentry from '@sentry/nextjs'

const log = createLogger('auth-actions')

export async function login(
  email: string,
  password: string,
  rememberMe: boolean = false,
  csrfToken?: string
): Promise<{ error?: string; success?: boolean }> {
  try {
    if (!csrfToken) {
      log.warn({ email }, 'CSRF token missing on login')
      return { error: 'Security token required. Please refresh the page.' }
    }

    // Validate CSRF token using ANONYMOUS_USER_ID (consistent with generation)
    const csrfCookie = await getCsrfCookie()
    const valid = await validateCsrfToken(ANONYMOUS_USER_ID, csrfToken, csrfCookie || '')
    if (!valid) {
      log.warn({ email }, 'Invalid CSRF token on login')
      // Generate a fresh token so the client can retry without a full page refresh
      await refreshCsrfForClient()
      return { error: 'Invalid security token. Please refresh the page and try again.' }
    }

    const headersList = await headers()
    const clientIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
      || headersList.get('x-real-ip')
      || 'unknown'

    const [ipLocked, locked] = await Promise.all([
      isLockedByIp(clientIp),
      isAccountLocked(email),
    ])

    if (ipLocked) {
      return { error: 'Too many failed attempts from this location. Please try again in 15 minutes.' }
    }

    if (locked) {
      return { error: 'Account is temporarily locked due to too many failed attempts. Please try again in 15 minutes.' }
    }

    const validationResult = loginSchema.safeParse({ email, password })
    if (!validationResult.success) {
      return { error: 'Invalid input: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      await Promise.all([
        recordFailedAttempt(email),
        recordFailedAttemptByIp(clientIp),
      ])
      return { error: 'Invalid email or password' }
    }

    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      const result = await recordFailedAttempt(email)
      await recordFailedAttemptByIp(clientIp)
      if (result.locked) {
        return { error: 'Account locked due to too many failed attempts. Please try again in 15 minutes.' }
      }
      return { error: `Invalid email or password. ${result.remaining} attempt${result.remaining !== 1 ? 's' : ''} remaining.` }
    }

    await Promise.all([
      clearFailedAttempts(email),
      clearFailedAttemptsByIp(clientIp),
    ])

    const [sessionId, ] = await Promise.all([
      createSession(user.id, user.email, user.name, user.role),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() } as import('@/lib/generated/prisma/client').Prisma.UserUpdateInput
      }),
    ])

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    })

    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7

    const cookieStore = await cookies()
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/'
    })

    return { success: true }
  } catch (error) {
    log.error({ email, error }, 'Login error')
    after(() => {
      Sentry.captureException(error, { tags: { action: 'login' } })
    })
    return { error: 'An unexpected error occurred during login' }
  }
}

export async function logout(csrfToken?: string): Promise<{ error?: string; success?: boolean }> {
  try {
    if (!csrfToken) {
      log.warn('CSRF token missing on logout')
      return { error: 'Security token required. Please refresh the page.' }
    }

    // For logout, the user is still authenticated, so resolve userId from JWT
    const cookieStore = await cookies()
    const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value
    let csrfUserId = ANONYMOUS_USER_ID

    if (authToken) {
      const payload = await verifyToken(authToken)
      if (payload?.userId) {
        csrfUserId = payload.userId
      }
    }

  const csrfCookie = await getCsrfCookie()
  const valid = await validateCsrfToken(csrfUserId, csrfToken, csrfCookie || '')
  if (!valid) {
    log.warn('Invalid CSRF token on logout')
    return { error: 'Invalid security token. Please refresh the page and try again.' }
  }

  if (authToken) {
    const payload = await verifyToken(authToken)
    if (payload?.sessionId) {
      after(async () => {
        await deleteSession(payload.sessionId!)
      })
    }
    if (payload?.jti) {
      after(async () => {
        await revokeToken(payload.jti!)
      })
    }
  }

    cookieStore.delete(AUTH_COOKIE_NAME)
    return { success: true }
  } catch (error) {
    log.error({ error }, 'Logout error')
    after(() => {
      Sentry.captureException(error, { tags: { action: 'logout' } })
    })
    return { error: 'Logout failed' }
  }
}

export async function getCurrentUser(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const { getCurrentUser: getCachedUser } = await import('@/lib/auth/user-utils')
  return getCachedUser()
}

/**
 * Refresh the CSRF token for the current anonymous user.
 * Called after a CSRF validation failure so the client can retry
 * without needing a full page refresh.
 */
async function refreshCsrfForClient(): Promise<void> {
  try {
    const { cookieValue } = await generateCsrfToken(ANONYMOUS_USER_ID)
    await setCsrfCookie(cookieValue)
    log.debug('CSRF token refreshed for anonymous user after validation failure')
  } catch (error) {
    log.warn({ error }, 'Failed to refresh CSRF token for client')
  }
}
