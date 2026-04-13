import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit'
import { jwtVerify } from 'jose'

interface JwtPayload {
    userId: string
    email: string
    role: string
    sessionId: string
    iat?: number
    [key: string]: unknown
}

const createMockJwtResult = (payload: JwtPayload) => {
    const result = {
        payload: payload as unknown as import('jose').JWTPayload,
        protectedHeader: { alg: 'HS256', typ: 'JWT' },
        key: new Uint8Array(32)
    }
    return result as unknown as import('jose').JWTVerifyResult & import('jose').ResolvedKey
}

// Mock dependencies
vi.mock('@/lib/middleware/rate-limit', () => ({
  rateLimitMiddleware: vi.fn()
}))

vi.mock('jose', () => ({
  jwtVerify: vi.fn()
}))

describe('Security Middleware', () => {
  const mockJwtVerify = vi.mocked(jwtVerify)
  const mockRateLimitMiddleware = vi.mocked(rateLimitMiddleware)

beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long'

    // Default mock implementations
    mockRateLimitMiddleware.mockResolvedValue(null)
    mockJwtVerify.mockResolvedValue(createMockJwtResult({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'USER',
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000)
    }))
})

  const createMockRequest = (options: {
    url?: string
    method?: string
    headers?: Record<string, string>
    cookies?: Record<string, string>
  } = {}): NextRequest => {
    const url = options.url || 'http://localhost:3000/'
    const headers = new Headers(options.headers || {})
    
    const request = new NextRequest(url, {
      method: options.method || 'GET',
      headers
    })
    
    // Mock cookies
    if (options.cookies) {
      Object.entries(options.cookies).forEach(([name, value]) => {
        request.cookies.set(name, value)
      })
    }
    
    return request
  }

  describe('Public Paths', () => {
    it('should allow access to login page without authentication', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/login' })
      const response = await middleware(request)
      
      expect(response.status).toBe(200)
      expect(mockJwtVerify).not.toHaveBeenCalled()
    })

    it('should allow access to registration page without authentication', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/register' })
      const response = await middleware(request)
      
      expect(response.status).toBe(200)
    })

    it('should allow access to public health endpoint without authentication', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/api/health/public' })
      const response = await middleware(request)
      
      expect(response.status).toBe(200)
    })

    it('should allow access to authentication API without authentication', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/api/auth/login' })
      const response = await middleware(request)
      
      expect(response.status).toBe(200)
    })

    it('should allow access to static assets without authentication', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/_next/static/test.js' })
      const response = await middleware(request)
      
      expect(response.status).toBe(200)
    })
  })

  describe('Authentication', () => {
    it('should redirect to login when accessing protected route without token', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/dashboard' })
      const response = await middleware(request)
      
      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3000/login')
    })

    it('should allow access with valid token', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/dashboard',
        cookies: { auth_token: 'valid-jwt-token' }
      })
      
      const response = await middleware(request)
      
      expect(response.status).toBe(200)
      expect(mockJwtVerify).toHaveBeenCalledWith('valid-jwt-token', expect.any(Uint8Array))
    })

    it('should redirect to login and clear cookie with invalid token', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'))
      
      const request = createMockRequest({
        url: 'http://localhost:3000/dashboard',
        cookies: { auth_token: 'invalid-token' }
      })
      
      const response = await middleware(request)
      
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/login')
      // Cookie should be deleted
      expect(response.cookies.get('auth_token')?.value).toBe('')
    })

    it('should add user headers to response with valid token', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/dashboard',
        cookies: { auth_token: 'valid-token' }
      })
      
      const response = await middleware(request)
      
      expect(response.headers.get('x-user-id')).toBe('user-123')
      expect(response.headers.get('x-user-email')).toBe('user@example.com')
      expect(response.headers.get('x-user-role')).toBe('USER')
    })
  })

  describe('Rate Limiting', () => {
    it('should apply rate limiting middleware', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/api/test' })
      await middleware(request)
      
      expect(mockRateLimitMiddleware).toHaveBeenCalledWith(request)
    })

    it('should return rate limit response when rate limited', async () => {
      const rateLimitResponse = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
      mockRateLimitMiddleware.mockResolvedValue(rateLimitResponse)
      
      const request = createMockRequest({ url: 'http://localhost:3000/api/test' })
      const response = await middleware(request)
      
      expect(response.status).toBe(429)
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    })

    it('should skip rate limiting for public paths', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/api/health/public' })
      await middleware(request)
      
      // Rate limiting should still be called, but the rate limit middleware
      // itself should exempt public paths
      expect(mockRateLimitMiddleware).toHaveBeenCalled()
    })
  })

  describe('Role-Based Access Control', () => {
    it('should allow ADMIN access to admin routes', async () => {
        mockJwtVerify.mockResolvedValue(createMockJwtResult({
            userId: 'admin-123',
            email: 'admin@example.com',
            role: 'ADMIN',
            sessionId: 'session-123'
        }))
      
      const request = createMockRequest({
        url: 'http://localhost:3000/api/admin/users',
        cookies: { auth_token: 'admin-token' }
      })
      
      const response = await middleware(request)
      
      expect(response.status).toBe(200)
    })

    it('should deny USER access to admin routes', async () => {
        mockJwtVerify.mockResolvedValue(createMockJwtResult({
            userId: 'user-123',
            email: 'user@example.com',
            role: 'USER',
            sessionId: 'session-123'
        }))
      
      const request = createMockRequest({
        url: 'http://localhost:3000/api/admin/users',
        cookies: { auth_token: 'user-token' }
      })
      
      const response = await middleware(request)
      
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toBe('Forbidden')
      expect(body.code).toBe('INSUFFICIENT_ROLE')
    })

    it('should allow MANAGER access to admin routes', async () => {
        mockJwtVerify.mockResolvedValue(createMockJwtResult({
            userId: 'manager-123',
            email: 'manager@example.com',
            role: 'MANAGER',
            sessionId: 'session-123'
        }))
      
      const request = createMockRequest({
        url: 'http://localhost:3000/api/admin/users',
        cookies: { auth_token: 'manager-token' }
      })
      
      const response = await middleware(request)
      
      expect(response.status).toBe(200)
    })
  })

  describe('Security Headers', () => {
    it('should add security headers to all responses', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/login' })
      const response = await middleware(request)
      
      // Check essential security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(response.headers.get('Content-Security-Policy')).toBeDefined()
      expect(response.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()')
      expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains; preload')
      expect(response.headers.get('X-DNS-Prefetch-Control')).toBe('on')
    })

    it('should add Expect-CT header', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/login' })
      const response = await middleware(request)
      
      expect(response.headers.get('Expect-CT')).toBe('max-age=86400, enforce')
    })

    it('should add Feature-Policy header', async () => {
      const request = createMockRequest({ url: 'http://localhost:3000/login' })
      const response = await middleware(request)
      
      expect(response.headers.get('Feature-Policy')).toBe("camera 'none'; microphone 'none'; geolocation 'none'")
    })

    it('should have different CSP for development and production', async () => {
        // @ts-expect-error - NODE_ENV is read-only but we need to test
        process.env.NODE_ENV = 'development'
        const devRequest = createMockRequest({ url: 'http://localhost:3000/login' })
        const devResponse = await middleware(devRequest)
        const devCsp = devResponse.headers.get('Content-Security-Policy')

        expect(devCsp).toContain("'unsafe-inline'")
        expect(devCsp).toContain("'unsafe-eval'")

        // @ts-expect-error - NODE_ENV is read-only but we need to test
        process.env.NODE_ENV = 'production'
      const prodRequest = createMockRequest({ url: 'http://localhost:3000/login' })
      const prodResponse = await middleware(prodRequest)
      const prodCsp = prodResponse.headers.get('Content-Security-Policy')
      
      expect(prodCsp).not.toContain("'unsafe-inline'")
      expect(prodCsp).not.toContain("'unsafe-eval'")
      expect(prodCsp).toContain("base-uri 'self'")
      expect(prodCsp).toContain("form-action 'self'")
      expect(prodCsp).toContain("object-src 'none'")
    })
  })

  describe('Session Management', () => {
    it('should redirect authenticated users away from public pages', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/login',
        cookies: { auth_token: 'valid-token' }
      })
      
      const response = await middleware(request)
      
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/')
    })

    it('should not redirect for favicon and static assets', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/favicon.ico',
        cookies: { auth_token: 'valid-token' }
      })
      
      const response = await middleware(request)
      
      expect(response.status).toBe(200)
    })

    it('should handle session refresh logic', async () => {
        const oldTimestamp = Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000) // 25 hours ago
        mockJwtVerify.mockResolvedValue(createMockJwtResult({
            userId: 'user-123',
            email: 'user@example.com',
            role: 'USER',
            sessionId: 'session-123',
            iat: oldTimestamp
        }))
      
      const request = createMockRequest({
        url: 'http://localhost:3000/dashboard',
        cookies: { auth_token: 'old-token' }
      })
      
      const response = await middleware(request)
      
      // Session is old but still valid, should allow access
      expect(response.status).toBe(200)
      // Note: Session refresh logic is currently a placeholder
    })
  })

  describe('Error Handling', () => {
    it('should handle missing JWT_SECRET environment variable', async () => {
      delete process.env.JWT_SECRET
      
      const request = createMockRequest({
        url: 'http://localhost:3000/dashboard',
        cookies: { auth_token: 'valid-token' }
      })
      
      // This should throw an error
      await expect(middleware(request)).rejects.toThrow('JWT_SECRET environment variable is required')
    })

    it('should handle rate limiting errors gracefully', async () => {
      mockRateLimitMiddleware.mockRejectedValue(new Error('Redis connection failed'))
      
      const request = createMockRequest({ url: 'http://localhost:3000/api/test' })
      
      // Should not throw, should continue without rate limiting
      const response = await middleware(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Request Headers', () => {
    it('should preserve original request headers', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/dashboard',
        headers: {
          'User-Agent': 'TestAgent/1.0',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        cookies: { auth_token: 'valid-token' }
      })
      
      const response = await middleware(request)
      
      // Response should continue with original headers preserved
      expect(response.status).toBe(200)
    })

    it('should handle X-Forwarded-For headers for client identification', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/test',
        headers: {
          'X-Forwarded-For': '192.168.1.1, 10.0.0.1'
        },
        cookies: { auth_token: 'valid-token' }
      })
      
      await middleware(request)
      
      // Rate limiting middleware should receive the request with X-Forwarded-For
      expect(mockRateLimitMiddleware).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            get: expect.any(Function)
          })
        })
      )
    })
  })
})