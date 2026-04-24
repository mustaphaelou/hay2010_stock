/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/db/redis', () => ({
  redis: {
    exists: vi.fn().mockResolvedValue(0),
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    ping: vi.fn().mockResolvedValue('PONG'),
  },
  isRedisReady: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('JWT Token', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  const validPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'USER',
    sessionId: 'test-session-id',
  }

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
