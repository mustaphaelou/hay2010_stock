'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { generateToken, verifyToken } from '@/lib/auth/jwt'
import { createSession, deleteSession } from '@/lib/auth/session'
import { loginSchema } from '@/lib/validation'
import { recordFailedAttempt, clearFailedAttempts, isAccountLocked } from '@/lib/auth/lockout'
import { validateCsrfToken } from '@/lib/security/csrf'

const COOKIE_NAME = 'auth_token'

export async function login(
  email: string, 
  password: string, 
  rememberMe: boolean = false, 
  csrfToken?: string
): Promise<{ error?: string; success?: boolean }> {
  try {
    if (csrfToken) {
      const valid = await validateCsrfToken('anonymous', csrfToken)
      if (!valid) {
        return { error: 'Invalid security token. Please refresh the page and try again.' }
      }
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
    console.error('Login error:', error)
    return { error: 'An unexpected error occurred during login' }
  }
}

export async function logout(csrfToken?: string): Promise<{ error?: string; success?: boolean }> {
  try {
    if (csrfToken) {
      const valid = await validateCsrfToken('anonymous', csrfToken)
      if (!valid) {
        return { error: 'Invalid security token. Please refresh the page and try again.' }
      }
    }

    const cookieStore = await cookies()
    const token = (await cookieStore).get(COOKIE_NAME)?.value

    if (token) {
      const payload = await verifyToken(token)
      if (payload?.sessionId) {
        await deleteSession(payload.sessionId)
      }
    }

    (await cookieStore).delete(COOKIE_NAME)
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { error: 'Logout failed' }
  }
}
