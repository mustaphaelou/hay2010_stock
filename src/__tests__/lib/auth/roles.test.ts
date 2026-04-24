import { describe, it, expect } from 'vitest'
import { ROLE_HIERARCHY } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/auth/roles'

describe('Auth Roles', () => {
  describe('ROLE_HIERARCHY', () => {
    it('should define all four roles', () => {
      const roles = Object.keys(ROLE_HIERARCHY) as UserRole[]

      expect(roles).toContain('ADMIN')
      expect(roles).toContain('MANAGER')
      expect(roles).toContain('USER')
      expect(roles).toContain('VIEWER')
    })

    it('should assign ADMIN the highest level', () => {
      expect(ROLE_HIERARCHY.ADMIN).toBe(100)
    })

    it('should assign MANAGER second highest level', () => {
      expect(ROLE_HIERARCHY.MANAGER).toBe(50)
    })

    it('should assign USER third level', () => {
      expect(ROLE_HIERARCHY.USER).toBe(25)
    })

    it('should assign VIEWER the lowest level', () => {
      expect(ROLE_HIERARCHY.VIEWER).toBe(10)
    })

    it('should have strictly increasing hierarchy', () => {
      expect(ROLE_HIERARCHY.ADMIN).toBeGreaterThan(ROLE_HIERARCHY.MANAGER)
      expect(ROLE_HIERARCHY.MANAGER).toBeGreaterThan(ROLE_HIERARCHY.USER)
      expect(ROLE_HIERARCHY.USER).toBeGreaterThan(ROLE_HIERARCHY.VIEWER)
    })
  })
})
