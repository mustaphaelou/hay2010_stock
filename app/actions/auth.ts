'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { generateToken, verifyToken } from '@/lib/auth/jwt'
import { createSession, getSession, deleteSession } from '@/lib/auth/session'
import { loginSchema, registerSchema } from '@/lib/validation'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'auth_token'

export async function login(email: string, password: string, rememberMe: boolean = false): Promise<{ error?: string; success?: boolean }> {
  try {
    const validationResult = loginSchema.safeParse({ email, password })
    if (!validationResult.success) {
      return { error: 'Invalid input: ' + validationResult.error.issues.map((e: { message: string }) => e.message).join(', ') }
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return { error: 'Invalid email or password' }
    }

    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return { error: 'Invalid email or password' }
    }

    const sessionId = await createSession(user.id, user.email, user.name, user.role)
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    })

    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7 // 30 days if remember me, else 7 days

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

export async function logout(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value

    if (token) {
      const payload = await verifyToken(token)
      if (payload?.sessionId) {
        await deleteSession(payload.sessionId)
      }
    }

    cookieStore.delete(COOKIE_NAME)
  } catch (error) {
    console.error('Logout error:', error)
  }

  redirect('/login')
}

export async function register(email: string, password: string, name: string): Promise<{ error?: string; success?: boolean }> {
  try {
    const validationResult = registerSchema.safeParse({ email, password, name })
    if (!validationResult.success) {
      return { error: 'Invalid input: ' + validationResult.error.issues.map((e: { message: string }) => e.message).join(', ') }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.warn('Registration attempt with existing email:', email)
      return { error: 'If this email is valid, you will receive a confirmation email' }
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'USER'
      }
    })

    const sessionId = await createSession(user.id, user.email, user.name, user.role)
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    })

    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    })

    return { success: true }
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
