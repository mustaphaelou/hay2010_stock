import { createLogger } from '@/lib/logger'
import { ROLE_HIERARCHY } from './roles'
import type { UserRole } from './roles'
import { resolveAuthUserDetailed, AuthError } from '@/lib/auth/user-utils'
import type { CurrentUser } from '@/lib/auth/user-utils'

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

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  let user: CurrentUser
  try {
    user = await resolveAuthUserDetailed()
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new Error('Unauthorized: Authentication required')
  }

  const userRole = user.role as UserRole
  if (!hasPermission(userRole, permission)) {
    log.warn({ userId: user.id, role: userRole, permission, code: 'INSUFFICIENT_PERMISSION' }, 'Permission denied')
    throw new Error('Forbidden')
  }

  return user
}

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] || 0
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return (Object.keys(RESOURCE_PERMISSIONS) as Permission[]).filter(permission =>
    hasPermission(role, permission)
  )
}
