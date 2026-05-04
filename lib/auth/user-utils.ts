import { cache } from 'react'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth/jwt'
import { getSession } from '@/lib/auth/session'
import { AUTH_COOKIE_NAME } from '@/lib/constants/auth'

export type CurrentUser = { id: string; email: string; name: string; role: string }

type AuthErrorMode = 'silent' | 'generic' | 'detailed'

interface ResolveAuthOptions {
  errorMode: AuthErrorMode
}

class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export { AuthError }

async function resolveAuthUser(options: ResolveAuthOptions = { errorMode: 'silent' }): Promise<CurrentUser> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    if (options.errorMode === 'detailed') throw new AuthError('Unauthorized: Authentication required')
    if (options.errorMode === 'generic') throw new AuthError('Unauthorized')
    return null as unknown as CurrentUser
  }

  const payload = await verifyToken(token)
  if (!payload) {
    if (options.errorMode === 'detailed') throw new AuthError('Unauthorized: Invalid token')
    if (options.errorMode === 'generic') throw new AuthError('Unauthorized')
    return null as unknown as CurrentUser
  }

  const session = await getSession(payload.sessionId)
  if (!session) {
    if (options.errorMode === 'detailed') throw new AuthError('Unauthorized: Session expired or revoked')
    if (options.errorMode === 'generic') throw new AuthError('Unauthorized')
    return null as unknown as CurrentUser
  }

  return {
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role
  }
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    return await resolveAuthUser({ errorMode: 'silent' })
  } catch {
    return null
  }
})

export async function requireAuth(): Promise<CurrentUser> {
  try {
    const user = await resolveAuthUser({ errorMode: 'generic' })
    return user
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new AuthError('Unauthorized')
  }
}

export async function requireRole(allowedRoles: string[]): Promise<CurrentUser> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}

export async function resolveAuthUserDetailed(): Promise<CurrentUser> {
  return resolveAuthUser({ errorMode: 'detailed' })
}
