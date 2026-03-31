import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth/jwt'
import { getSession } from '@/lib/auth/session'

const COOKIE_NAME = 'auth_token'

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
