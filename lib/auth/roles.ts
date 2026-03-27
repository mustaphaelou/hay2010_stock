import { requireAuth } from '@/app/actions/auth'
import { AuthUser } from '@/lib/types'

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  MANAGER: 50,
  USER: 25,
  VIEWER: 10
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['*'],
  MANAGER: ['read', 'write', 'update', 'delete', 'export', 'import'],
  USER: ['read', 'write', 'update'],
  VIEWER: ['read']
}

export async function requireRole(allowedRoles: UserRole[]): Promise<{ id: string; email: string; name: string; role: string }> {
  const user = await requireAuth()
  const userRole = (user.role || 'USER') as UserRole
  
  const hasRole = allowedRoles.some(role => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0
    const requiredLevel = ROLE_HIERARCHY[role] || 0
    return userLevel >= requiredLevel
  })
  
  if (!hasRole) {
    throw new Error('Insufficient permissions')
  }
  
  return user
}

export function hasPermission(user: AuthUser, permission: string): boolean {
  const role = (user.role || 'USER') as UserRole
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes('*') || permissions.includes(permission)
}

export function hasRole(user: AuthUser, minRole: UserRole): boolean {
  const userRole = (user.role || 'USER') as UserRole
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole] || 0)
}
