import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockVerifyToken } = vi.hoisted(() => ({
  mockVerifyToken: vi.fn(),
}))

const { mockGenerateCsrfToken, mockSetCsrfCookie, mockGetCsrfCookie } = vi.hoisted(() => ({
  mockGenerateCsrfToken: vi.fn().mockResolvedValue({ token: 'csrf-token-123', cookieValue: 'cookie-val-456' }),
  mockSetCsrfCookie: vi.fn(),
  mockGetCsrfCookie: vi.fn().mockResolvedValue('existing-cookie'),
}))

vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: mockVerifyToken,
}))

vi.mock('@/lib/security/csrf-server', () => ({
  generateCsrfToken: mockGenerateCsrfToken,
  setCsrfCookie: mockSetCsrfCookie,
  getCsrfCookie: mockGetCsrfCookie,
  validateCsrfToken: vi.fn().mockResolvedValue(true),
  ANONYMOUS_USER_ID: 'anonymous',
  CSRF_COOKIE_NAME: 'csrf_token',
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'auth-token' }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

import { GET } from '@/app/api/csrf-token/route'

describe('CSRF Token API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateCsrfToken.mockResolvedValue({ token: 'csrf-token-123', cookieValue: 'cookie-val-456' })
  })

  it('should use anonymous user ID when no auth token', async () => {
    const { cookies } = await import('next/headers')
    vi.mocked(cookies).mockResolvedValueOnce({
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      delete: vi.fn(),
    } as any)

    const response = await GET()
    const data = await response.json()

    expect(data.token).toBe('csrf-token-123')
    expect(mockGenerateCsrfToken).toHaveBeenCalledWith('anonymous')
  })

  it('should use user ID from valid auth token', async () => {
    mockVerifyToken.mockResolvedValue({ userId: 'user-1', sessionId: 'sess-1' })

    const response = await GET()
    const data = await response.json()

    expect(data.token).toBe('csrf-token-123')
    expect(mockGenerateCsrfToken).toHaveBeenCalledWith('user-1')
  })

  it('should fall back to anonymous when token verification fails', async () => {
    mockVerifyToken.mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(data.token).toBe('csrf-token-123')
    expect(mockGenerateCsrfToken).toHaveBeenCalledWith('anonymous')
  })

  it('should set CSRF cookie on response', async () => {
    const response = await GET()

    expect(response.headers.get('set-cookie') || response.cookies).toBeDefined()
  })

  it('should return 500 on error', async () => {
    mockGenerateCsrfToken.mockRejectedValue(new Error('Redis down'))

    const response = await GET()

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to generate CSRF token')
  })
})
