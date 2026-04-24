import '@testing-library/jest-dom/vitest'

import { vi } from 'vitest'

if (typeof TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util')
    global.TextEncoder = TextEncoder
    global.TextDecoder = TextDecoder
}

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-minimum-32-chars'
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db'
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
process.env.NEXT_PUBLIC_SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || ''

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
        refresh: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    unstable_cache: vi.fn((fn) => fn),
}))

const mockRedisClient = {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    multi: vi.fn().mockReturnThis(),
    exec: vi.fn(),
    zadd: vi.fn(),
    zcard: vi.fn(),
    zremrangebyscore: vi.fn(),
    scan: vi.fn(),
    on: vi.fn(),
}

vi.mock('@/lib/db/redis', () => ({
    redis: mockRedisClient,
    redisCache: mockRedisClient,
    redisSession: mockRedisClient,
    isRedisReady: vi.fn().mockReturnValue(true),
    getRedisError: vi.fn().mockReturnValue(null),
}))


