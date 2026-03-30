import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../../../../lib/auth/password'

describe('password', () => {
  describe('hashPassword', () => {
    it('should produce valid bcrypt hash', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash).not.toBe(password)
      expect(hash.startsWith('$2')).toBe(true)
      expect(hash.length).toBe(60)
    })

    it('should produce different hashes for same password', async () => {
      const password = 'testPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password successfully', async () => {
      const password = 'correctPassword123'
      const hash = await hashPassword(password)

      const result = await verifyPassword(password, hash)

      expect(result).toBe(true)
    })

    it('should fail verification for incorrect password', async () => {
      const password = 'correctPassword123'
      const wrongPassword = 'wrongPassword456'
      const hash = await hashPassword(password)

      const result = await verifyPassword(wrongPassword, hash)

      expect(result).toBe(false)
    })

    it('should handle invalid hash format', async () => {
      const password = 'testPassword123'
      const invalidHash = 'invalid-hash-format'

      const result = await verifyPassword(password, invalidHash)

      expect(result).toBe(false)
    })

    it('should handle empty hash', async () => {
      const password = 'testPassword123'
      const emptyHash = ''

      const result = await verifyPassword(password, emptyHash)

      expect(result).toBe(false)
    })
  })
})
