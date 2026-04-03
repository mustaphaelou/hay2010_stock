'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { generateToken, verifyToken } from '@/lib/auth/jwt'
import { createSession, deleteSession } from '@/lib/auth/session'
import { loginSchema } from '@/lib/validation'
import { recordFailedAttempt, clearFailedAttempts, isAccountLocked } from '@/lib/auth/lockout'
import { validateCsrfToken } from '@/lib/security/csrf-server'
import { createLogger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

const log = createLogger('auth-actions')

const COOKIE_NAME = 'auth_token'

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

    const valid = await validateCsrfToken('anonymous', csrfToken)
    if (!valid) {
      log.warn({ email }, 'Invalid CSRF token on login')
      return { error: 'Invalid security token. Please refresh the page and try again.' }
    }

    const locked = await isAccountLocked(email)
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
      await recordFailedAttempt(email)
      return { error: 'Invalid email or password' }
    }

    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      const result = await recordFailedAttempt(email)
      if (result.locked) {
        return { error: 'Account locked due to too many failed attempts. Please try again in 15 minutes.' }
      }
      return { error: `Invalid email or password. ${result.remaining} attempt${result.remaining !== 1 ? 's' : ''} remaining.` }
    }

    await clearFailedAttempts(email)

    const sessionId = await createSession(user.id, user.email, user.name, user.role)
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    })

    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7

    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/'
    })

    return { success: true }
  } catch (error) {
    log.error({ email, error }, 'Login error')
    Sentry.captureException(error, { tags: { action: 'login' } })
    return { error: 'An unexpected error occurred during login' }
  }
}

export async function logout(csrfToken?: string): Promise<{ error?: string; success?: boolean }> {
  try {
    if (!csrfToken) {
      log.warn('CSRF token missing on logout')
      return { error: 'Security token required. Please refresh the page.' }
    }

    const valid = await validateCsrfToken('anonymous', csrfToken)
    if (!valid) {
      log.warn('Invalid CSRF token on logout')
      return { error: 'Invalid security token. Please refresh the page and try again.' }
    }

    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value

    if (token) {
      const payload = await verifyToken(token)
      if (payload?.sessionId) {
        await deleteSession(payload.sessionId)
      }
    }

    cookieStore.delete(COOKIE_NAME)
    return { success: true }
  } catch (error) {
    log.error({ error }, 'Logout error')
    Sentry.captureException(error, { tags: { action: 'logout' } })
    return { error: 'Logout failed' }
  }
}

export async function getCurrentUser(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value

    if (!token) {
      return null
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true }
    })

    return user
  } catch (error) {
    log.error({ error }, 'Get current user error')
    return null
  }
}
