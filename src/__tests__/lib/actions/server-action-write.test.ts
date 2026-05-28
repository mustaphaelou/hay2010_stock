import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'

const { mockRequirePermission, mockRequireAuth } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
  mockRequireAuth: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockRequireCsrfToken, mockGetCsrfCookie, mockGenerateCsrfToken, mockSetCsrfCookie } = vi.hoisted(() => ({
  mockRequireCsrfToken: vi.fn().mockResolvedValue(undefined),
  mockGetCsrfCookie: vi.fn().mockResolvedValue('csrf-cookie'),
  mockGenerateCsrfToken: vi.fn().mockResolvedValue({ token: 'new-token', cookieValue: 'new-cookie' }),
  mockSetCsrfCookie: vi.fn().mockResolvedValue(undefined),
}))

const { mockRunInvalidations } = vi.hoisted(() => ({
  mockRunInvalidations: vi.fn(),
}))

const { mockRevalidatePath } = vi.hoisted(() => ({
  mockRevalidatePath: vi.fn(),
}))

const { mockAfter } = vi.hoisted(() => ({
  mockAfter: vi.fn((fn: () => void | Promise<void>) => fn()),
}))

vi.mock('@/lib/auth/authorization', () => ({
  requirePermission: mockRequirePermission,
  RESOURCE_PERMISSIONS: {},
}))

vi.mock('@/lib/auth/user-utils', () => ({
  requireAuth: mockRequireAuth,
}))

vi.mock('@/lib/security/csrf-server', () => ({
  requireCsrfToken: mockRequireCsrfToken,
  getCsrfCookie: mockGetCsrfCookie,
  generateCsrfToken: mockGenerateCsrfToken,
  setCsrfCookie: mockSetCsrfCookie,
}))

vi.mock('@/lib/cache/invalidation', () => ({
  runInvalidations: mockRunInvalidations,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('next/server', () => ({
  after: mockAfter,
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { serverActionWrite } from '@/lib/actions/server-action-write'

describe('serverActionWrite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    mockRequireAuth.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    mockRequireCsrfToken.mockResolvedValue(undefined)
    mockGetCsrfCookie.mockResolvedValue('csrf-cookie')
    mockAfter.mockImplementation((fn: () => void | Promise<void>) => fn())
  })

  describe('auth resolution', () => {
    it('should resolve user via requirePermission', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await serverActionWrite('stock:write', 'token', writeFn)

      expect(mockRequirePermission).toHaveBeenCalledWith('stock:write')
      expect(writeFn).toHaveBeenCalledWith({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    })

    it('should resolve user via requireAuth when permission is "authenticated"', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await serverActionWrite('authenticated', 'token', writeFn)

      expect(mockRequireAuth).toHaveBeenCalled()
      expect(mockRequirePermission).not.toHaveBeenCalled()
      expect(writeFn).toHaveBeenCalledWith({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    })

    it('should skip auth when permission is "public"', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await serverActionWrite('public', 'token', writeFn)

      expect(mockRequireAuth).not.toHaveBeenCalled()
      expect(mockRequirePermission).not.toHaveBeenCalled()
    })

    it('should throw when permission check fails', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Forbidden'))

      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await expect(serverActionWrite('stock:write', 'token', writeFn)).rejects.toThrow('Forbidden')
      expect(writeFn).not.toHaveBeenCalled()
    })
  })

  describe('CSRF validation', () => {
    it('should validate CSRF when csrfToken is provided', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await serverActionWrite('stock:write', 'my-token', writeFn)

      expect(mockGetCsrfCookie).toHaveBeenCalled()
      expect(mockRequireCsrfToken).toHaveBeenCalledWith('user-1', 'my-token', 'csrf-cookie')
    })

    it('should use anonymous userId for CSRF when public', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await serverActionWrite('public', 'my-token', writeFn)

      expect(mockRequireCsrfToken).toHaveBeenCalledWith('anonymous', 'my-token', 'csrf-cookie')
    })

    it('should skip CSRF when csrfToken is undefined', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await serverActionWrite('stock:write', undefined, writeFn)

      expect(mockRequireCsrfToken).not.toHaveBeenCalled()
    })

    it('should return { error } on CSRF validation failure and auto-rotate', async () => {
      mockRequireCsrfToken.mockRejectedValue(new Error('Invalid CSRF'))

      const writeFn = vi.fn().mockResolvedValue({ success: true })
      const result = await serverActionWrite('stock:write', 'bad-token', writeFn)

      expect(result).toEqual({ error: 'Jeton de sécurité invalide. Veuillez rafraîchir la page et réessayer.' })
      expect(writeFn).not.toHaveBeenCalled()
      expect(mockGenerateCsrfToken).toHaveBeenCalledWith('user-1')
      expect(mockSetCsrfCookie).toHaveBeenCalledWith('new-cookie')
    })
  })

  describe('Zod validation', () => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

    it('should validate with Zod when validation is provided', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await serverActionWrite('authenticated', 'token', writeFn, {
        validation: { schema, input: { email: 'test@test.com', password: 'pass' } },
      })

      expect(writeFn).toHaveBeenCalled()
    })

    it('should return { error } on Zod validation failure with default message', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      const result = await serverActionWrite('authenticated', 'token', writeFn, {
        validation: { schema, input: { email: 'not-an-email', password: '' } },
      })

      expect(result).toEqual({ error: expect.any(String) })
      expect((result as { error: string }).error).toContain('Invalid email')
      expect(writeFn).not.toHaveBeenCalled()
    })

    it('should return { error } on Zod validation failure with custom message', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      const result = await serverActionWrite('authenticated', 'token', writeFn, {
        validation: { schema, input: { email: 'bad', password: '' }, message: 'Entrée invalide' },
      })

      expect(result).toEqual({ error: 'Entrée invalide' })
      expect(writeFn).not.toHaveBeenCalled()
    })
  })

  describe('writeFn execution', () => {
    it('should execute writeFn and return result on success', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true, data: { id: 42 } })
      const result = await serverActionWrite('stock:write', 'token', writeFn)

      expect(writeFn).toHaveBeenCalledWith({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
      expect(result).toEqual({ success: true, data: { id: 42 } })
    })

    it('should propagate thrown errors from writeFn', async () => {
      const writeFn = vi.fn().mockRejectedValue(new Error('Business error'))

      await expect(serverActionWrite('stock:write', 'token', writeFn)).rejects.toThrow('Business error')
    })

    it('should return { error } from writeFn when writeFn returns error', async () => {
      const writeFn = vi.fn().mockResolvedValue({ error: 'Something failed' })
      const result = await serverActionWrite('stock:write', 'token', writeFn)

      expect(result).toEqual({ error: 'Something failed' })
    })
  })

  describe('cache invalidation', () => {
    it('should dispatch cache invalidations in after()', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await serverActionWrite('stock:write', 'token', writeFn, {
        invalidations: [{ kind: 'product', productId: 5 }],
      })

      expect(mockRunInvalidations).toHaveBeenCalledWith([{ kind: 'product', productId: 5 }])
    })

    it('should revalidate paths in after()', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await serverActionWrite('stock:write', 'token', writeFn, {
        revalidatePaths: ['/articles', '/stock'],
      })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/articles')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/stock')
    })

    it('should skip invalidation and revalidation when writeFn returns error', async () => {
      mockAfter.mockImplementation(() => {})

      const writeFn = vi.fn().mockResolvedValue({ error: 'Something failed' })
      await serverActionWrite('stock:write', 'token', writeFn, {
        invalidations: [{ kind: 'product', productId: 1 }],
        revalidatePaths: ['/articles'],
      })

      expect(mockRunInvalidations).not.toHaveBeenCalled()
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it('should run invalidations inside after() callback, not synchronously', async () => {
      const afterCalls: Array<() => void | Promise<void>> = []
      mockAfter.mockImplementation((fn: () => void | Promise<void>) => { afterCalls.push(fn) })

      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await serverActionWrite('stock:write', 'token', writeFn, {
        invalidations: [{ kind: 'product', productId: 1 }],
        revalidatePaths: ['/articles'],
      })

      expect(mockRunInvalidations).not.toHaveBeenCalled()
      expect(mockRevalidatePath).not.toHaveBeenCalled()

      for (const fn of afterCalls) {
        await fn()
      }

      expect(mockRunInvalidations).toHaveBeenCalledWith([{ kind: 'product', productId: 1 }])
      expect(mockRevalidatePath).toHaveBeenCalledWith('/articles')
    })
  })
})
