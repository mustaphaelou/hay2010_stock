

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER'

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  MANAGER: 50,
  USER: 25,
  VIEWER: 10
}
