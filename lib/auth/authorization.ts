import { cookies } from 'next/headers'
import { verifyToken } from './jwt'
import { getSession } from './session'
import { createLogger } from '@/lib/logger'
import { AUTH_COOKIE_NAME } from '@/lib/constants/auth'
import { ROLE_HIERARCHY } from './roles'
import type { UserRole } from './roles'

export type { UserRole }
export { ROLE_HIERARCHY }

const log = createLogger('authorization')

export const RESOURCE_PERMISSIONS = {
  'stock:read': ['ADMIN', 'MANAGER', 'USER', 'VIEWER'],
  'stock:write': ['ADMIN', 'MANAGER', 'USER'],
  'stock:delete': ['ADMIN', 'MANAGER'],

  'documents:read': ['ADMIN', 'MANAGER', 'USER', 'VIEWER'],
  'documents:write': ['ADMIN', 'MANAGER', 'USER'],
  'documents:delete': ['ADMIN'],
  'documents:export': ['ADMIN', 'MANAGER'],

  'partners:read': ['ADMIN', 'MANAGER', 'USER', 'VIEWER'],
  'partners:write': ['ADMIN', 'MANAGER'],
  'partners:delete': ['ADMIN'],

  'users:read': ['ADMIN', 'MANAGER'],
  'users:write': ['ADMIN'],
  'users:delete': ['ADMIN'],

  'reports:view': ['ADMIN', 'MANAGER'],
  'reports:export': ['ADMIN', 'MANAGER'],

  'affairs:read': ['ADMIN', 'MANAGER', 'USER', 'VIEWER'],
  'affairs:write': ['ADMIN', 'MANAGER', 'USER'],
  'affairs:delete': ['ADMIN'],
} as const

export type Permission = keyof typeof RESOURCE_PERMISSIONS

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const allowedRoles = RESOURCE_PERMISSIONS[permission]
  return (allowedRoles as readonly string[]).includes(userRole)
}

export function hasRole(userRole: UserRole, minRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole] || 0)
}

export async function requirePermission(permission: Permission): Promise<{ id: string; email: string; name: string; role: string }> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    throw new Error('Unauthorized: Authentication required')
  }

  const payload = await verifyToken(token)
  if (!payload) {
    throw new Error('Unauthorized: Invalid token')
  }

  const session = await getSession(payload.sessionId)
  if (!session) {
    throw new Error('Unauthorized: Session expired or revoked')
  }

  const userRole = payload.role as UserRole
  if (!hasPermission(userRole, permission)) {
  log.warn({ userId: payload.userId, role: userRole, permission, code: 'INSUFFICIENT_PERMISSION' }, 'Permission denied')
  throw new Error('Forbidden')
  }

  return {
    id: payload.userId,
    email: payload.email,
    name: session.name,
    role: payload.role,
  }
}

export async function getUserFromToken(): Promise<{ id: string; email: string; role: UserRole } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

    if (!token) return null

    const payload = await verifyToken(token)
    if (!payload) return null

    const session = await getSession(payload.sessionId)
    if (!session) return null

    return {
      id: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.debug({ error: errorMessage }, 'Failed to get user from token')
    return null
  }
}

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] || 0
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return (Object.keys(RESOURCE_PERMISSIONS) as Permission[]).filter(permission =>
    hasPermission(role, permission)
  )
}
