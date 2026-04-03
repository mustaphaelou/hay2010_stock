import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { JWTPayload } from '@/lib/auth/jwt'

const originalEnv = process.env

describe('JWT Token', () => {
  const validPayload: JWTPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'USER',
    sessionId: 'test-session-id',
  }

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-key-for-testing-minimum-32-chars',
      JWT_EXPIRES_IN: '1h',
    }
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const { generateToken } = await import('@/lib/auth/jwt')
      const token = await generateToken(validPayload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })

    it('should include payload data in token', async () => {
      const { generateToken, verifyToken } = await import('@/lib/auth/jwt')
      const token = await generateToken(validPayload)
      const decoded = await verifyToken(token)
      expect(decoded).not.toBeNull()
      expect(decoded?.userId).toBe(validPayload.userId)
      expect(decoded?.email).toBe(validPayload.email)
      expect(decoded?.role).toBe(validPayload.role)
    })
  })

  describe('verifyToken', () => {
    it('should return payload for valid token', async () => {
      const { generateToken, verifyToken } = await import('@/lib/auth/jwt')
      const token = await generateToken(validPayload)
      const result = await verifyToken(token)
      expect(result).not.toBeNull()
      expect(result?.userId).toBe(validPayload.userId)
      expect(result?.email).toBe(validPayload.email)
      expect(result?.role).toBe(validPayload.role)
      expect(result?.sessionId).toBe(validPayload.sessionId)
    })

    it('should return null for invalid token', async () => {
      const { verifyToken } = await import('@/lib/auth/jwt')
      const result = await verifyToken('invalid.token.here')
      expect(result).toBeNull()
    })

    it('should return null for empty token', async () => {
      const { verifyToken } = await import('@/lib/auth/jwt')
      const result = await verifyToken('')
      expect(result).toBeNull()
    })

    it('should return null for malformed token', async () => {
      const { verifyToken } = await import('@/lib/auth/jwt')
      const result = await verifyToken('not-a-jwt-token')
      expect(result).toBeNull()
    })
  })
})
