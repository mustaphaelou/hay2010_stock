import '@testing-library/jest-dom/vitest'

import { vi } from 'vitest'

// Ensure TextEncoder is available (required for jose library)
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-minimum-32-chars'
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db'
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

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
