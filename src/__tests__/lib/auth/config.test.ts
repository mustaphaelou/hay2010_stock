import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AUTH_CONFIG, isFailClosedEnabled } from '@/lib/auth/config'

describe('Auth Config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('AUTH_CONFIG', () => {
    it('should have lockout config with correct defaults', () => {
      expect(AUTH_CONFIG.lockout.maxAttempts).toBe(5)
      expect(AUTH_CONFIG.lockout.lockoutDuration).toBe(15 * 60)
    })

    it('should have rate limit config enabled by default', () => {
      expect(AUTH_CONFIG.rateLimit.enabled).toBe(true)
    })

    it('should have session config with 24h maxAge', () => {
      expect(AUTH_CONFIG.session.maxAge).toBe(24 * 60 * 60)
      expect(AUTH_CONFIG.session.httpOnly).toBe(true)
      expect(AUTH_CONFIG.session.sameSite).toBe('lax')
    })

    it('should have password requirements', () => {
      expect(AUTH_CONFIG.password.minLength).toBe(8)
      expect(AUTH_CONFIG.password.requireUppercase).toBe(true)
      expect(AUTH_CONFIG.password.requireLowercase).toBe(true)
      expect(AUTH_CONFIG.password.requireNumber).toBe(true)
    })
  })

  describe('isFailClosedEnabled', () => {
    it('should return false when neither env var is set', () => {
      delete process.env.LOCKOUT_FAIL_CLOSED
      delete process.env.RATE_LIMIT_FAIL_CLOSED

      expect(isFailClosedEnabled()).toBe(false)
    })

    it('should return true when LOCKOUT_FAIL_CLOSED is true', () => {
      process.env.LOCKOUT_FAIL_CLOSED = 'true'

      expect(isFailClosedEnabled()).toBe(true)
    })

    it('should return true when RATE_LIMIT_FAIL_CLOSED is true', () => {
      process.env.RATE_LIMIT_FAIL_CLOSED = 'true'

      expect(isFailClosedEnabled()).toBe(true)
    })

    it('should return false for non-"true" values', () => {
      process.env.LOCKOUT_FAIL_CLOSED = 'false'
      process.env.RATE_LIMIT_FAIL_CLOSED = '1'

      expect(isFailClosedEnabled()).toBe(false)
    })
  })
})
