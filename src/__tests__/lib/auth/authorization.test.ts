import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  hasRole,
  getRoleLevel,
  getPermissionsForRole,
} from '@/lib/auth/authorization'

describe('Authorization', () => {
  describe('hasPermission', () => {
    it('should return true for ADMIN with all permissions', () => {
      expect(hasPermission('ADMIN', 'stock:read')).toBe(true)
      expect(hasPermission('ADMIN', 'stock:write')).toBe(true)
      expect(hasPermission('ADMIN', 'stock:delete')).toBe(true)
      expect(hasPermission('ADMIN', 'documents:delete')).toBe(true)
      expect(hasPermission('ADMIN', 'users:write')).toBe(true)
    })

    it('should return correct permissions for MANAGER', () => {
      expect(hasPermission('MANAGER', 'stock:read')).toBe(true)
      expect(hasPermission('MANAGER', 'stock:write')).toBe(true)
      expect(hasPermission('MANAGER', 'stock:delete')).toBe(true)
      expect(hasPermission('MANAGER', 'documents:delete')).toBe(false)
      expect(hasPermission('MANAGER', 'users:write')).toBe(false)
    })

    it('should return correct permissions for USER', () => {
      expect(hasPermission('USER', 'stock:read')).toBe(true)
      expect(hasPermission('USER', 'stock:write')).toBe(true)
      expect(hasPermission('USER', 'stock:delete')).toBe(false)
      expect(hasPermission('USER', 'documents:write')).toBe(true)
      expect(hasPermission('USER', 'documents:delete')).toBe(false)
    })

    it('should return correct permissions for VIEWER', () => {
      expect(hasPermission('VIEWER', 'stock:read')).toBe(true)
      expect(hasPermission('VIEWER', 'stock:write')).toBe(false)
      expect(hasPermission('VIEWER', 'stock:delete')).toBe(false)
      expect(hasPermission('VIEWER', 'documents:read')).toBe(true)
      expect(hasPermission('VIEWER', 'documents:write')).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('should return true when user has equal or higher role', () => {
      expect(hasRole('ADMIN', 'ADMIN')).toBe(true)
      expect(hasRole('ADMIN', 'MANAGER')).toBe(true)
      expect(hasRole('ADMIN', 'USER')).toBe(true)
      expect(hasRole('ADMIN', 'VIEWER')).toBe(true)

      expect(hasRole('MANAGER', 'MANAGER')).toBe(true)
      expect(hasRole('MANAGER', 'USER')).toBe(true)
      expect(hasRole('MANAGER', 'VIEWER')).toBe(true)

      expect(hasRole('USER', 'USER')).toBe(true)
      expect(hasRole('USER', 'VIEWER')).toBe(true)

      expect(hasRole('VIEWER', 'VIEWER')).toBe(true)
    })

    it('should return false when user has lower role', () => {
      expect(hasRole('VIEWER', 'ADMIN')).toBe(false)
      expect(hasRole('VIEWER', 'MANAGER')).toBe(false)
      expect(hasRole('VIEWER', 'USER')).toBe(false)

      expect(hasRole('USER', 'ADMIN')).toBe(false)
      expect(hasRole('USER', 'MANAGER')).toBe(false)

      expect(hasRole('MANAGER', 'ADMIN')).toBe(false)
    })
  })

  describe('getRoleLevel', () => {
    it('should return correct hierarchy levels', () => {
      expect(getRoleLevel('ADMIN')).toBe(100)
      expect(getRoleLevel('MANAGER')).toBe(50)
      expect(getRoleLevel('USER')).toBe(25)
      expect(getRoleLevel('VIEWER')).toBe(10)
    })
  })

  describe('getPermissionsForRole', () => {
    it('should return all permissions for ADMIN', () => {
      const permissions = getPermissionsForRole('ADMIN')
      expect(permissions.length).toBeGreaterThan(10)
      expect(permissions).toContain('stock:read')
      expect(permissions).toContain('stock:write')
      expect(permissions).toContain('stock:delete')
      expect(permissions).toContain('documents:delete')
      expect(permissions).toContain('users:delete')
    })

    it('should return limited permissions for USER', () => {
      const permissions = getPermissionsForRole('USER')
      expect(permissions).toContain('stock:read')
      expect(permissions).toContain('stock:write')
      expect(permissions).not.toContain('stock:delete')
      expect(permissions).not.toContain('users:delete')
    })

    it('should return only read permissions for VIEWER', () => {
      const permissions = getPermissionsForRole('VIEWER')
      expect(permissions).toContain('stock:read')
      expect(permissions).toContain('documents:read')
      expect(permissions).toContain('partners:read')
      expect(permissions).not.toContain('stock:write')
      expect(permissions).not.toContain('documents:write')
    })
  })
})
