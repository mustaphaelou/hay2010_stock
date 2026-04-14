import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getPublicHealth } from '@/app/api/health/public/route'
import { GET as getAdminHealth } from '@/app/api/health/route'
import { prisma } from '@/lib/db/prisma'
import { redis } from '@/lib/db/redis'
import { checkRedisHealth } from '@/lib/db/redis-cluster'
import { verifyToken } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    user: {
      count: vi.fn()
    },
    niveauStock: {
      count: vi.fn()
    },
    mouvementStock: {
      count: vi.fn()
    }
  }
}))

vi.mock('@/lib/db/redis', () => ({
  redis: {
    ping: vi.fn()
  }
}))

vi.mock('@/lib/db/redis-cluster', () => ({
  checkRedisHealth: vi.fn()
}))

vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: vi.fn()
}))

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }))
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'valid-token' })
  })
}))

describe('Health Check Endpoints', () => {
  const mockCookies = vi.mocked(cookies)
  const mockVerifyToken = vi.mocked(verifyToken)

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mocks to default behavior
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ count: BigInt(4) }])
    vi.mocked(redis.ping).mockResolvedValue('PONG')
    vi.mocked(checkRedisHealth).mockResolvedValue({ connected: true, latency: 5, memory: { used: 1024, peak: 2048, total: 4096 } })
    vi.mocked(prisma.user.count).mockResolvedValue(10)
    vi.mocked((prisma as unknown as { niveauStock: { count: ReturnType<typeof vi.fn> } }).niveauStock.count).mockResolvedValue(100)
    vi.mocked((prisma as unknown as { mouvementStock: { count: ReturnType<typeof vi.fn> } }).mouvementStock.count).mockResolvedValue(1000)

    // Mock next/headers cookies
    // @ts-expect-error - Mocking only the required get method
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'valid-token' })
    })

    // Mock jwt verification
    mockVerifyToken.mockResolvedValue({
      userId: 'user-123',
      email: 'admin@example.com',
      role: 'ADMIN',
      sessionId: 'session-123'
    })
  })

  describe('Public Health Check', () => {
    it('should return healthy status when all services are up', async () => {
      const response = await getPublicHealth()
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data.checks.database).toBe(true)
      expect(data.checks.redis).toBe(true)
      expect(data.checks.app).toBe(true)
      expect(data.message).toBe('All systems operational')
    })

  it('should return degraded status when database is down', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Database connection failed'))

    const response = await getPublicHealth()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('error')
    expect(data.checks.database).toBe(false)
    // When database fails, Redis check is not reached
    expect(data.checks.redis).toBe(false)
    expect(data.message).toBe('Service unavailable')
  })

  it('should return degraded status when Redis is down', async () => {
    vi.mocked(checkRedisHealth).mockResolvedValue({ connected: false, latency: -1, memory: { used: 0, peak: 0, total: 0 } })

    const response = await getPublicHealth()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('degraded')
    expect(data.checks.database).toBe(true)
    expect(data.checks.redis).toBe(false)
  })

    it('should include version and environment information', async () => {
        process.env.npm_package_version = '1.2.3'

        const response = await getPublicHealth()
        const data = await response.json()

        expect(data.version).toBe('1.2.3')
        expect(data.environment).toBeDefined()
    })
  })

  describe('Admin Health Check', () => {
    const mockTokenPayload = {
      userId: 'user-123',
      email: 'admin@example.com',
      role: 'ADMIN' as const,
      sessionId: 'session-123'
    }

    beforeEach(() => {
      // @ts-expect-error - Mocking only the required get method
      mockCookies.mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'valid-token' })
      })
      mockVerifyToken.mockResolvedValue(mockTokenPayload)
    })

    it('should require authentication', async () => {
      // @ts-expect-error - Mocking only the required get method
      mockCookies.mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined)
      })

      const response = await getAdminHealth()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe('AUTHENTICATION_ERROR')
      expect(data.error).toBe('Authentication required')
    })

    it('should reject invalid tokens', async () => {
      mockVerifyToken.mockResolvedValue(null)
      
      const response = await getAdminHealth()
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.code).toBe('AUTHENTICATION_ERROR')
      expect(data.error).toBe('Invalid or expired token')
    })

    it('should require ADMIN or MANAGER role', async () => {
      mockVerifyToken.mockResolvedValue({
        ...mockTokenPayload,
        role: 'USER'
      })
      
      const response = await getAdminHealth()
      const data = await response.json()
      
      expect(response.status).toBe(403)
      expect(data.code).toBe('AUTHORIZATION_ERROR')
      expect(data.error).toBe('Insufficient permissions. ADMIN or MANAGER role required.')
    })

    it('should return detailed health information for MANAGER role', async () => {
      mockVerifyToken.mockResolvedValue({
        ...mockTokenPayload,
        role: 'MANAGER'
      })
      
      const response = await getAdminHealth()
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data.user.role).toBe('MANAGER')
      expect(data.user.isAdmin).toBe(false)
      expect(data.checks.database.connected).toBe(true)
      expect(data.checks.redis.connected).toBe(true)
      expect(data.checks.schema.valid).toBe(true)
      expect(data.summary.database).toBe('connected')
      expect(data.summary.redis).toBe('connected')
      expect(data.summary.schema).toBe('valid')
      expect(data.latency.database).toBeGreaterThanOrEqual(0)
      expect(data.latency.redis).toBeGreaterThanOrEqual(0)
      expect(data.systemMetrics).toBeUndefined() // Only for ADMIN
    })

  it('should return system metrics for ADMIN role', async () => {
    // Mock the three database calls in order:
    // 1. SELECT 1 (line 109)
    // 2. Schema check (line 135)
    // 3. DB size (line 155)
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ '?column?': 1 }]) // SELECT 1
      .mockResolvedValueOnce([{ count: BigInt(4) }]) // Schema check
      .mockResolvedValueOnce([{ size: '10485760' }]) // DB size

    const response = await getAdminHealth()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user.isAdmin).toBe(true)
    expect(data.systemMetrics).toBeDefined()
    expect(data.systemMetrics.databaseSize).toBe('10.00 MB')
    expect(data.systemMetrics.counts.users).toBe(10)
    expect(data.systemMetrics.counts.stockItems).toBe(100)
    expect(data.systemMetrics.counts.stockMovements).toBe(1000)
  })

  it('should handle database connection failure', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection refused'))

    const response = await getAdminHealth()
    const data = await response.json()

    // Admin health check handles errors gracefully and returns 200 with error details
    expect(response.status).toBe(200)
    expect(data.status).toBe('degraded')
    expect(data.checks.database.connected).toBe(false)
    expect(data.checks.database.error).toBe('Connection refused')
    expect(data.summary.database).toBe('disconnected')
  })

  it('should handle Redis connection failure', async () => {
    vi.mocked(checkRedisHealth).mockResolvedValue({ connected: false, latency: -1, memory: { used: 0, peak: 0, total: 0 } })

    const response = await getAdminHealth()
    const data = await response.json()

    // Admin health check handles errors gracefully and returns 200 with degraded status
    expect(response.status).toBe(200)
    expect(data.status).toBe('degraded')
    expect(data.checks.redis.connected).toBe(false)
    expect(data.summary.redis).toBe('disconnected')
  })

    it('should detect schema validation issues', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ count: BigInt(3) }]) // Wrong number of roles
      
      const response = await getAdminHealth()
      const data = await response.json()
      
      expect(data.checks.schema.valid).toBe(false)
      expect(data.checks.schema.error).toBe('Expected 4 Role enum values, found 3')
      expect(data.summary.schema).toBe('invalid')
    })

    it('should handle partial failures with degraded status', async () => {
        vi.mocked(checkRedisHealth).mockResolvedValue({ connected: false, latency: -1, memory: { used: 0, peak: 0, total: 0 } })

        const response = await getAdminHealth()
        const data = await response.json()

        expect(data.status).toBe('degraded')
        expect(data.message).toContain('Some services are degraded')
    })

  it('should include detailed error information when health check fails', async () => {
    // Mock database to fail
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Unexpected database error'))

    const response = await getAdminHealth()
    const data = await response.json()

    // Admin health check handles errors gracefully
    expect(response.status).toBe(200)
    expect(data.status).toBe('degraded')
    expect(data.checks.database.error).toBe('Unexpected database error')
    expect(data.checks.database.connected).toBe(false)
  })
    })

    describe('Performance and Latency', () => {
    it('should measure database latency', async () => {
        // @ts-expect-error - mockImplementation type mismatch
        vi.mocked(prisma.$queryRaw).mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 50))
            return [{ count: BigInt(4) }]
        })

        const response = await getAdminHealth()
        const data = await response.json()

        expect(data.latency.database).toBeGreaterThanOrEqual(50)
        expect(data.latency.database).toBeLessThan(100)
    })

  it('should measure Redis latency', async () => {
    vi.mocked(checkRedisHealth).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
      return { connected: true, latency: 25, memory: { used: 1024, peak: 2048, total: 4096 } }
    })

    const response = await getAdminHealth()
    const data = await response.json()

    expect(data.latency.redis).toBeGreaterThanOrEqual(20)
    expect(data.latency.redis).toBeLessThan(50)
  })
  })

  describe('Security', () => {
    it('should not expose sensitive information in public health check', async () => {
      const response = await getPublicHealth()
      const data = await response.json()
      
      // Public health should not include:
      expect(data.user).toBeUndefined()
      expect(data.systemMetrics).toBeUndefined()
      expect(data.checks.schema).toBeUndefined()
      // Should only include basic checks
      expect(Object.keys(data.checks)).toEqual(['database', 'redis', 'app'])
    })

    it('should include user information only in admin health check', async () => {
      const response = await getAdminHealth()
      const data = await response.json()
      
      expect(data.user).toBeDefined()
      expect(data.user.id).toBe('user-123')
      expect(data.user.email).toBe('admin@example.com')
      expect(data.user.role).toBe('ADMIN')
    })

    it('should validate JWT token properly', async () => {
      mockVerifyToken.mockRejectedValue(new Error('Token verification failed'))
      
      const response = await getAdminHealth()
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.code).toBe('AUTHENTICATION_ERROR')
      expect(data.error).toBe('Token verification failed')
    })
  })
})