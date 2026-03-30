'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { generateToken, verifyToken } from '@/lib/auth/jwt'
import { createSession, getSession, deleteSession } from '@/lib/auth/session'
import { loginSchema, registerSchema } from '@/lib/validation'
import { recordFailedAttempt, clearFailedAttempts, isAccountLocked } from '@/lib/auth/lockout'

const COOKIE_NAME = 'auth_token'

export async function login(email: string, password: string, rememberMe: boolean = false, csrfToken?: string): Promise<{ error?: string; success?: boolean }> {
  try {
    if (csrfToken) {
      const { validateCsrfToken } = await import('@/lib/security/csrf')
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
      return { error: 'Invalid input: ' + validationResult.error.issues.map((e: { message: string }) => e.message).join(', ') }
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
    return { error: 'An unexpected error occurred' }
  }
}

export async function logout(csrfToken?: string): Promise<{ error?: string; success?: boolean }> {
  try {
    if (csrfToken) {
      const { validateCsrfToken } = await import('@/lib/security/csrf')
      const valid = await validateCsrfToken('anonymous', csrfToken)
      if (!valid) {
        return { error: 'Invalid security token. Please refresh the page and try again.' }
      }
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
    console.error('Logout error:', error)
    return { error: 'Logout failed' }
  }
}

export async function register(email: string, password: string, name: string, csrfToken?: string): Promise<{ error?: string; success?: boolean; message?: string }> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { error: 'Unauthorized: Admin access required for user creation' }
    }

    if (csrfToken) {
      const { validateCsrfToken } = await import('@/lib/security/csrf')
      const valid = await validateCsrfToken(currentUser.id, csrfToken)
      if (!valid) {
        return { error: 'Invalid security token. Please refresh the page and try again.' }
      }
    }

    const allowedRoles = ['ADMIN', 'MANAGER']
    if (!allowedRoles.includes(currentUser.role)) {
      return { error: 'Forbidden: Only admins and managers can create users' }
    }

    const validationResult = registerSchema.safeParse({ email, password, name })
    if (!validationResult.success) {
      return { error: 'Invalid input: ' + validationResult.error.issues.map((e: { message: string }) => e.message).join(', ') }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return { success: true, message: 'If this email is not registered, you will receive a verification email.' }
    }

    const hashedPassword = await hashPassword(password)

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'USER'
      }
    })

    return { success: true, message: 'If this email is not registered, you will receive a verification email.' }
  } catch (error) {
    console.error('Register error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function getCurrentUser(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value

    if (!token) return null

    const payload = await verifyToken(token)
    if (!payload) return null

    const session = await getSession(payload.sessionId)
    if (!session) return null

    return {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role
    }
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<{ id: string; email: string; name: string; role: string }> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireRole(allowedRoles: string[]): Promise<{ id: string; email: string; name: string; role: string }> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}
