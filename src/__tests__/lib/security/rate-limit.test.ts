import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ============ HELPERS ============

function makeHeaders(init?: Record<string, string>) {
  const map = new Map(Object.entries(init || {}))
  return {
    get: (k: string) => map.get(k) ?? null,
    set: (k: string, v: string) => { map.set(k, v) },
    entries: () => map.entries(),
    forEach: (cb: (v: string, k: string) => void) => map.forEach(cb),
  }
}

function createMockRequest(apiKeyId?: string): any {
  const headers = new Map<string, string>()
  if (apiKeyId) headers.set('x-api-key-id', apiKeyId)
  return {
    url: 'http://localhost/api/test',
    headers: {
      get: (k: string) => headers.get(k) ?? null,
    },
  }
}

function createMockHandler(status = 200, body = { ok: true }): any {
  return vi.fn().mockResolvedValue({
    status,
    json: async () => body,
    headers: makeHeaders(),
  })
}

// ============ HOISTED MOCKS ============

const { mockRedis } = vi.hoisted(() => ({
  mockRedis: {
    incr: vi.fn(),
    expire: vi.fn(),
  },
}))

// ============ STATIC MOCKS ============

vi.mock('@/lib/db/redis', () => ({
  redis: mockRedis,
  CacheKeys: { RATE_LIMIT: 'ratelimit:' },
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => body,
      headers: makeHeaders(init?.headers),
    })),
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

import { withRateLimit, TIER_LIMITS } from '@/lib/security/rate-limit'

// ============ TESTS ============

describe('TIER_LIMITS', () => {
  it('has correct read tier defaults', () => {
    expect(TIER_LIMITS.read).toEqual({ requests: 120, window: 60 })
  })

  it('has correct write tier defaults', () => {
    expect(TIER_LIMITS.write).toEqual({ requests: 30, window: 60 })
  })
})

describe('withRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.incr.mockReset()
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.expire.mockReset()
    mockRedis.expire.mockResolvedValue('OK')
  })

  describe('basic rate limiting', () => {
    it('allows request when under read tier limit', async () => {
      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'read')

      const result = await limited(createMockRequest())

      expect(result.status).toBe(200)
      expect(handler).toHaveBeenCalled()
    })

    it('allows request when under write tier limit', async () => {
      mockRedis.incr.mockResolvedValue(29)

      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'write')

      const result = await limited(createMockRequest())

      expect(result.status).toBe(200)
      expect(handler).toHaveBeenCalled()
    })

    it('returns 429 when over read tier limit', async () => {
      mockRedis.incr.mockResolvedValue(121)

      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'read')

      const result = await limited(createMockRequest())

      expect(result.status).toBe(429)
      expect(handler).not.toHaveBeenCalled()
    })

    it('returns 429 when over write tier limit', async () => {
      mockRedis.incr.mockResolvedValue(31)

      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'write')

      const result = await limited(createMockRequest())

      expect(result.status).toBe(429)
      expect(handler).not.toHaveBeenCalled()
    })

    it('includes rate limit headers in successful response', async () => {
      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'read')

      const result = await limited(createMockRequest())

      expect(result.headers.get('X-RateLimit-Limit')).toBe('120')
      expect(result.headers.get('X-RateLimit-Remaining')).toBe('119')
      expect(result.headers.get('X-RateLimit-Reset')).toBeDefined()
      expect(Number(result.headers.get('X-RateLimit-Remaining'))).toBeGreaterThanOrEqual(0)
    })

    it('includes Retry-After header in 429 response', async () => {
      mockRedis.incr.mockResolvedValue(121)

      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'read')

      const result = await limited(createMockRequest())

      expect(result.status).toBe(429)
      expect(result.headers.get('X-RateLimit-Limit')).toBe('120')
      expect(result.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(result.headers.get('Retry-After')).toBeDefined()
    })

    it('uses x-api-key-id header for client identification', async () => {
      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'write')

      await limited(createMockRequest('key-abc'))

      expect(mockRedis.incr).toHaveBeenCalledWith(
        expect.stringContaining('key-abc')
      )
    })

    it('falls back to anonymous when no x-api-key-id header', async () => {
      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'read')

      await limited(createMockRequest())

      expect(mockRedis.incr).toHaveBeenCalledWith(
        expect.stringContaining(':anonymous:')
      )
    })

    it('sets expiry on first request in window', async () => {
      mockRedis.incr.mockResolvedValue(1)

      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'read')

      await limited(createMockRequest())

      expect(mockRedis.expire).toHaveBeenCalled()
    })

    it('skips expiry on subsequent requests', async () => {
      mockRedis.incr.mockResolvedValue(5)

      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'read')

      await limited(createMockRequest())

      expect(mockRedis.expire).not.toHaveBeenCalled()
    })

    it('defaults to read tier for unknown tier', async () => {
      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'unknown' as any)

      const result = await limited(createMockRequest())

      expect(result.status).toBe(200)
    })
  })

  describe('fail-open / fail-closed', () => {
    it('proceeds on Redis error (fail-open)', async () => {
      mockRedis.incr.mockRejectedValue(new Error('Redis down'))

      const handler = createMockHandler()
      const limited = withRateLimit(handler, 'read')

      const result = await limited(createMockRequest())

      expect(result.status).toBe(200)
    })

    it('rejects when RATE_LIMIT_FAIL_CLOSED is enabled and Redis fails', async () => {
      const original = process.env.RATE_LIMIT_FAIL_CLOSED
      try {
        process.env.RATE_LIMIT_FAIL_CLOSED = 'true'
        mockRedis.incr.mockRejectedValue(new Error('Redis down'))

        const handler = createMockHandler()
        const limited = withRateLimit(handler, 'read')

        const result = await limited(createMockRequest())

        expect(result.status).toBe(429)
      } finally {
        process.env.RATE_LIMIT_FAIL_CLOSED = original
      }
    })
  })
})

describe('circuit breaker', () => {
  let withRateLimitFn: typeof withRateLimit
  let redisMock: { incr: ReturnType<typeof vi.fn>; expire: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    vi.resetModules()

    redisMock = {
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue('OK'),
    }

    vi.doMock('@/lib/db/redis', () => ({
      redis: redisMock,
      CacheKeys: { RATE_LIMIT: 'ratelimit:' },
    }))

    vi.doMock('next/server', () => ({
      NextResponse: {
        json: vi.fn((body: any, init?: any) => ({
          status: init?.status || 200,
          json: async () => body,
          headers: makeHeaders(init?.headers),
        })),
      },
      NextRequest: vi.fn(),
    }))

    vi.doMock('@/lib/logger', () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }),
    }))

    const mod = await import('@/lib/security/rate-limit')
    withRateLimitFn = mod.withRateLimit
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens circuit after consecutive Redis failures', async () => {
    redisMock.incr.mockRejectedValue(new Error('Redis down'))

    const handler = createMockHandler()
    const limited = withRateLimitFn(handler, 'read')

    for (let i = 0; i < 4; i++) {
      const res = await limited(createMockRequest())
      expect(res.status).toBe(200)
    }

    const res = await limited(createMockRequest())
    expect(res.status).toBe(429)
    expect(handler).toHaveBeenCalledTimes(4)
  })

  it('rejects requests when circuit is open even with working Redis', async () => {
    redisMock.incr.mockRejectedValue(new Error('Redis down'))
    let limited = withRateLimitFn(createMockHandler(), 'read')

    for (let i = 0; i < 5; i++) {
      await limited(createMockRequest())
    }

    redisMock.incr.mockReset()
    redisMock.incr.mockResolvedValue(1)

    const handler = createMockHandler()
    limited = withRateLimitFn(handler, 'read')

    const res = await limited(createMockRequest())
    expect(res.status).toBe(429)
    expect(handler).not.toHaveBeenCalled()
  })

  it('enters half-open after reset time and closes circuit on success', async () => {
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))

    redisMock.incr.mockRejectedValue(new Error('Redis down'))
    let limited = withRateLimitFn(createMockHandler(), 'read')

    for (let i = 0; i < 5; i++) {
      await limited(createMockRequest())
    }

    vi.setSystemTime(new Date('2025-01-01T00:01:01Z'))

    redisMock.incr.mockReset()
    redisMock.incr.mockResolvedValue(1)

    const handler = createMockHandler()
    limited = withRateLimitFn(handler, 'read')

    const res = await limited(createMockRequest())
    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalled()
  })

  it('re-opens circuit if half-open probe fails', async () => {
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))

    redisMock.incr.mockRejectedValue(new Error('Redis down'))
    let limited = withRateLimitFn(createMockHandler(), 'read')

    for (let i = 0; i < 5; i++) {
      await limited(createMockRequest())
    }

    vi.setSystemTime(new Date('2025-01-01T00:01:01Z'))

    const handler = createMockHandler()
    limited = withRateLimitFn(handler, 'read')

    const res = await limited(createMockRequest())
    expect(res.status).toBe(429)
    expect(handler).not.toHaveBeenCalled()
  })
})
