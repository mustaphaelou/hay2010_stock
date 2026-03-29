import { cookies } from 'next/headers'
import { verifyToken } from './jwt'

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  MANAGER: 50,
  USER: 25,
  VIEWER: 10,
}

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

export async function requirePermission(permission: Permission): Promise<{ id: string; email: string; role: string }> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    throw new Error('Unauthorized: Authentication required')
  }

  const payload = await verifyToken(token)
  if (!payload) {
    throw new Error('Unauthorized: Invalid token')
  }

  const userRole = payload.role as UserRole
  if (!hasPermission(userRole, permission)) {
    throw new Error(`Forbidden: ${permission} permission required`)
  }

  return {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
  }
}

export async function getUserFromToken(): Promise<{ id: string; email: string; role: UserRole } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) return null

    const payload = await verifyToken(token)
    if (!payload) return null

    return {
      id: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
    }
  } catch {
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
