import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRedis } = vi.hoisted(() => {
  const multi = vi.fn()
  const exec = vi.fn()
  return {
    mockRedis: {
      multi,
      exec,
      incr: vi.fn(),
      ttl: vi.fn(),
      zadd: vi.fn(),
      zcard: vi.fn(),
      zremrangebyscore: vi.fn(),
      expire: vi.fn(),
    },
  }
})

vi.mock('@/lib/db/redis-cluster', () => ({
  redis: mockRedis,
  CacheKeys: {
    RATE_LIMIT: 'ratelimit:',
  },
  CacheTTL: {
    RATE_LIMIT: 60,
  },
}))

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({
      headers: new Headers(),
    })),
    json: vi.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
      headers: new Headers(init?.headers),
    })),
    redirect: vi.fn(),
  },
  NextRequest: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('@/lib/auth/user-utils', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
}))

import { rateLimitMiddleware, withRateLimit } from '@/lib/middleware/rate-limit'

function createMockRequest(path: string, ip = '127.0.0.1'): any {
  return {
    url: `http://localhost${path}`,
    headers: new Map([
      ['x-forwarded-for', ip],
    ]),
    nextUrl: new URL(`http://localhost${path}`),
  }
}

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.exec.mockResolvedValue([null, null, [null, 1], null])
    mockRedis.incr.mockReset()
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.ttl.mockResolvedValue(60)
    mockRedis.multi.mockReturnValue(mockRedis)
  })

  describe('rateLimitMiddleware', () => {
    it('should return null for exempt paths', async () => {
      const result = await rateLimitMiddleware(createMockRequest('/api/health/public'))
      expect(result).toBeNull()
    })

    it('should return null for _next paths', async () => {
      const result = await rateLimitMiddleware(createMockRequest('/_next/static/chunks/main.js'))
      expect(result).toBeNull()
    })

    it('should return null when under rate limit', async () => {
      const result = await rateLimitMiddleware(createMockRequest('/api/stock'))
      expect(result).toBeNull()
    })

    it('should return 429 when over rate limit', async () => {
      mockRedis.exec.mockResolvedValue([null, null, [null, 100], null])

      const result = await rateLimitMiddleware(createMockRequest('/api/auth/login'))

      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
    })

    it('should include rate limit headers in 429 response', async () => {
      mockRedis.exec.mockResolvedValue([null, null, [null, 100], null])

      const result = await rateLimitMiddleware(createMockRequest('/api/auth/login'))

      expect(result).not.toBeNull()
      expect(result!.headers.get('X-RateLimit-Limit')).toBeDefined()
      expect(result!.headers.get('X-RateLimit-Remaining')).toBeDefined()
      expect(result!.headers.get('X-RateLimit-Reset')).toBeDefined()
    })

    it('should use sliding window for critical paths', async () => {
      await rateLimitMiddleware(createMockRequest('/api/auth/login'))

      expect(mockRedis.multi).toHaveBeenCalled()
      expect(mockRedis.zremrangebyscore).toHaveBeenCalled()
      expect(mockRedis.zadd).toHaveBeenCalled()
      expect(mockRedis.zcard).toHaveBeenCalled()
      expect(mockRedis.expire).toHaveBeenCalled()
      expect(mockRedis.exec).toHaveBeenCalled()
    })
  })

  describe('withRateLimit', () => {
    it('should execute action when under rate limit', async () => {
      mockRedis.incr.mockResolvedValue(1)

      const mockAction = vi.fn().mockResolvedValue('success')
      const limited = withRateLimit(mockAction, { requests: 5, window: 60 })

      const result = await limited()

      expect(result).toBe('success')
    })

    it('should proceed on Redis error (fail-open)', async () => {
      mockRedis.incr = vi.fn(() => { throw new Error('Redis down') })

      const mockAction = vi.fn().mockResolvedValue('success')
      const limited = withRateLimit(mockAction, { requests: 5, window: 60, message: 'Too many requests' })

      const result = await limited()
      expect(result).toBe('success')
    })

    it('should set expiry on first request', async () => {
      mockRedis.incr.mockResolvedValue(1)

      const mockAction = vi.fn().mockResolvedValue('success')
      const limited = withRateLimit(mockAction, { requests: 5, window: 60 })

      await limited()

      expect(mockRedis.expire).toHaveBeenCalled()
    })
  })
})
