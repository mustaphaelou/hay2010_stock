import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'

const { mockRequirePermission, mockRequireAuth } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
  mockRequireAuth: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockValidateActionCsrf } = vi.hoisted(() => ({
  mockValidateActionCsrf: vi.fn().mockResolvedValue(null),
}))

const { mockGenerateCsrfToken, mockSetCsrfCookie } = vi.hoisted(() => ({
  mockGenerateCsrfToken: vi.fn().mockResolvedValue({ token: 'new-token', cookieValue: 'new-cookie' }),
  mockSetCsrfCookie: vi.fn().mockResolvedValue(undefined),
}))

const { mockInvalidateProduct, mockInvalidateStock, mockInvalidatePartner, mockInvalidateDocument, mockInvalidateUser, mockInvalidateAffaire, mockInvalidateWarehouse, mockInvalidateCategory, mockInvalidateDashboard, mockInvalidateAll } = vi.hoisted(() => ({
  mockInvalidateProduct: vi.fn(),
  mockInvalidateStock: vi.fn(),
  mockInvalidatePartner: vi.fn(),
  mockInvalidateDocument: vi.fn(),
  mockInvalidateUser: vi.fn(),
  mockInvalidateAffaire: vi.fn(),
  mockInvalidateWarehouse: vi.fn(),
  mockInvalidateCategory: vi.fn(),
  mockInvalidateDashboard: vi.fn(),
  mockInvalidateAll: vi.fn(),
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

vi.mock('@/lib/utils/action-helpers', () => ({
  validateActionCsrf: mockValidateActionCsrf,
}))

vi.mock('@/lib/security/csrf-server', () => ({
  generateCsrfToken: mockGenerateCsrfToken,
  setCsrfCookie: mockSetCsrfCookie,
}))

vi.mock('@/lib/cache/invalidation', () => ({
  CacheInvalidationService: {
    invalidateProduct: mockInvalidateProduct,
    invalidateStock: mockInvalidateStock,
    invalidatePartner: mockInvalidatePartner,
    invalidateDocument: mockInvalidateDocument,
    invalidateUser: mockInvalidateUser,
    invalidateAffaire: mockInvalidateAffaire,
    invalidateWarehouse: mockInvalidateWarehouse,
    invalidateCategory: mockInvalidateCategory,
    invalidateDashboard: mockInvalidateDashboard,
    invalidateAll: mockInvalidateAll,
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

vi.mock('next/server', () => ({
  after: mockAfter,
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { executeWrite, executeRead } from '@/lib/actions/execute-write'

describe('executeWrite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    mockRequireAuth.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    mockValidateActionCsrf.mockResolvedValue(null)
    mockAfter.mockImplementation((fn: () => void | Promise<void>) => fn())
  })

  describe('auth resolution', () => {
    it('should resolve user via requirePermission when permission is a Permission string', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({ permission: 'stock:write', csrfToken: 'token', writeFn })

      expect(mockRequirePermission).toHaveBeenCalledWith('stock:write')
      expect(writeFn).toHaveBeenCalledWith({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    })

    it('should resolve user via requireAuth when permission is "authenticated"', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({ permission: 'authenticated', csrfToken: 'token', writeFn })

      expect(mockRequireAuth).toHaveBeenCalled()
      expect(mockRequirePermission).not.toHaveBeenCalled()
      expect(writeFn).toHaveBeenCalledWith({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    })

    it('should skip auth when permission is undefined', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({ writeFn })

      expect(mockRequireAuth).not.toHaveBeenCalled()
      expect(mockRequirePermission).not.toHaveBeenCalled()
    })

    it('should throw when permission check fails', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Forbidden'))

      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await expect(executeWrite({ permission: 'stock:write', csrfToken: 'token', writeFn })).rejects.toThrow('Forbidden')
      expect(writeFn).not.toHaveBeenCalled()
    })

    it('should skip auth when permission is omitted (default undefined)', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({ csrfToken: 'token', writeFn })

      expect(mockRequireAuth).not.toHaveBeenCalled()
      expect(mockRequirePermission).not.toHaveBeenCalled()
    })
  })

  describe('CSRF validation', () => {
    it('should validate CSRF when csrfToken is provided', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({ permission: 'stock:write', csrfToken: 'my-token', writeFn })

      expect(mockValidateActionCsrf).toHaveBeenCalledWith('user-1', 'my-token')
    })

    it('should use anonymous userId for CSRF when no auth (permission undefined)', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({ csrfToken: 'my-token', writeFn })

      expect(mockValidateActionCsrf).toHaveBeenCalledWith('anonymous', 'my-token')
    })

    it('should skip CSRF when csrfToken is undefined', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({ permission: 'stock:write', writeFn })

      expect(mockValidateActionCsrf).not.toHaveBeenCalled()
    })

    it('should return { error } on CSRF validation failure', async () => {
      mockValidateActionCsrf.mockResolvedValue('Jeton de sécurité invalide. Veuillez rafraîchir la page et réessayer.')

      const writeFn = vi.fn().mockResolvedValue({ success: true })
      const result = await executeWrite({ permission: 'stock:write', csrfToken: 'bad-token', writeFn })

      expect(result).toEqual({ error: 'Jeton de sécurité invalide. Veuillez rafraîchir la page et réessayer.' })
      expect(writeFn).not.toHaveBeenCalled()
    })

    it('should auto-rotate CSRF token on validation failure by default', async () => {
      mockValidateActionCsrf.mockResolvedValue('CSRF error')

      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({ permission: 'stock:write', csrfToken: 'bad-token', writeFn })

      expect(mockGenerateCsrfToken).toHaveBeenCalledWith('user-1')
      expect(mockSetCsrfCookie).toHaveBeenCalledWith('new-cookie')
    })

    it('should not auto-rotate CSRF when autoRotateCsrf is false', async () => {
      mockValidateActionCsrf.mockResolvedValue('CSRF error')

      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({ permission: 'stock:write', csrfToken: 'bad-token', autoRotateCsrf: false, writeFn })

      expect(mockGenerateCsrfToken).not.toHaveBeenCalled()
      expect(mockSetCsrfCookie).not.toHaveBeenCalled()
    })
  })

  describe('Zod validation', () => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) })

    it('should validate with Zod when validation is provided', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({
        permission: 'authenticated',
        csrfToken: 'token',
        validation: { schema, input: { email: 'test@test.com', password: 'pass' } },
        writeFn,
      })

      expect(writeFn).toHaveBeenCalled()
    })

    it('should return { error } on Zod validation failure with default message', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      const result = await executeWrite({
        permission: 'authenticated',
        csrfToken: 'token',
        validation: { schema, input: { email: 'not-an-email', password: '' } },
        writeFn,
      })

      expect(result).toEqual({ error: expect.any(String) })
      expect((result as { error: string }).error).toContain('Invalid email')
      expect(writeFn).not.toHaveBeenCalled()
    })

    it('should return { error } on Zod validation failure with custom message', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      const result = await executeWrite({
        permission: 'authenticated',
        csrfToken: 'token',
        validation: { schema, input: { email: 'bad', password: '' }, message: 'Entrée invalide' },
        writeFn,
      })

      expect(result).toEqual({ error: 'Entrée invalide' })
      expect(writeFn).not.toHaveBeenCalled()
    })
  })

  describe('writeFn execution', () => {
    it('should execute writeFn and return result on success', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true, data: { id: 42 } })
      const result = await executeWrite({ permission: 'stock:write', csrfToken: 'token', writeFn })

      expect(writeFn).toHaveBeenCalledWith({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
      expect(result).toEqual({ success: true, data: { id: 42 } })
    })

    it('should propagate thrown errors from writeFn', async () => {
      const writeFn = vi.fn().mockRejectedValue(new Error('Business error'))

      await expect(executeWrite({ permission: 'stock:write', csrfToken: 'token', writeFn })).rejects.toThrow('Business error')
    })

    it('should return { error } from writeFn when writeFn returns error', async () => {
      const writeFn = vi.fn().mockResolvedValue({ error: 'Something failed' })
      const result = await executeWrite({ permission: 'stock:write', csrfToken: 'token', writeFn })

      expect(result).toEqual({ error: 'Something failed' })
    })
  })

  describe('cache invalidation', () => {
    it('should dispatch cache invalidations in after()', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({
        permission: 'stock:write',
        csrfToken: 'token',
        writeFn,
        invalidations: [{ kind: 'product', productId: 5 }],
      })

      expect(mockInvalidateProduct).toHaveBeenCalledWith(5)
    })

    it.skip('should dispatch all invalidation kinds — ref: microtask order after mockAfter', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({
        permission: 'stock:write',
        csrfToken: 'token',
        writeFn,
        invalidations: [
          { kind: 'product', productId: 1 },
          { kind: 'stock', productId: 2, warehouseId: 3 },
          { kind: 'partner', partnerId: 4 },
          { kind: 'document', documentId: 5 },
          { kind: 'user', userId: 'u1' },
          { kind: 'affaire', affaireId: 6 },
          { kind: 'warehouse', warehouseId: 7 },
          { kind: 'category', categoryId: 8 },
          { kind: 'dashboard' },
          { kind: 'all' },
        ],
      })

      expect(mockInvalidateProduct).toHaveBeenCalledWith(1)
      expect(mockInvalidateStock).toHaveBeenCalledWith(2, 3)
      expect(mockInvalidatePartner).toHaveBeenCalledWith(4)
      expect(mockInvalidateDocument).toHaveBeenCalledWith(5)
      expect(mockInvalidateUser).toHaveBeenCalledWith('u1')
      expect(mockInvalidateAffaire).toHaveBeenCalledWith(6)
      expect(mockInvalidateWarehouse).toHaveBeenCalledWith(7)
      expect(mockInvalidateCategory).toHaveBeenCalledWith(8)
      expect(mockInvalidateDashboard).toHaveBeenCalled()
      expect(mockInvalidateAll).toHaveBeenCalled()
    })

    it('should revalidate paths in after()', async () => {
      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({
        permission: 'stock:write',
        csrfToken: 'token',
        writeFn,
        revalidatePaths: ['/articles', '/stock'],
      })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/articles')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/stock')
    })

    it('should skip invalidation and revalidation when writeFn returns error', async () => {
      mockAfter.mockImplementation(() => {})

      const writeFn = vi.fn().mockResolvedValue({ error: 'Something failed' })
      await executeWrite({
        permission: 'stock:write',
        csrfToken: 'token',
        writeFn,
        invalidations: [{ kind: 'product', productId: 1 }],
        revalidatePaths: ['/articles'],
      })

      expect(mockInvalidateProduct).not.toHaveBeenCalled()
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it('should run invalidations inside after() callback, not synchronously', async () => {
      const afterCalls: Array<() => void | Promise<void>> = []
      mockAfter.mockImplementation((fn: () => void | Promise<void>) => { afterCalls.push(fn) })

      const writeFn = vi.fn().mockResolvedValue({ success: true })
      await executeWrite({
        permission: 'stock:write',
        csrfToken: 'token',
        writeFn,
        invalidations: [{ kind: 'product', productId: 1 }],
        revalidatePaths: ['/articles'],
      })

      expect(mockInvalidateProduct).not.toHaveBeenCalled()
      expect(mockRevalidatePath).not.toHaveBeenCalled()

      for (const fn of afterCalls) {
        await fn()
      }

      expect(mockInvalidateProduct).toHaveBeenCalledWith(1)
      expect(mockRevalidatePath).toHaveBeenCalledWith('/articles')
    })
  })
})

describe('executeRead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    mockRequireAuth.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
  })

  it('should resolve user with requirePermission when permission is a Permission string', async () => {
    const readFn = vi.fn().mockResolvedValue({ data: [] })
    await executeRead({ permission: 'stock:read', readFn })

    expect(mockRequirePermission).toHaveBeenCalledWith('stock:read')
  })

  it('should resolve user with requireAuth when permission is "authenticated"', async () => {
    const readFn = vi.fn().mockResolvedValue({ data: [] })
    await executeRead({ permission: 'authenticated', readFn })

    expect(mockRequireAuth).toHaveBeenCalled()
  })

  it('should default to "authenticated" when permission is omitted', async () => {
    const readFn = vi.fn().mockResolvedValue({ data: [] })
    await executeRead({ readFn })

    expect(mockRequireAuth).toHaveBeenCalled()
  })

  it('should execute readFn and return result', async () => {
    const data = [{ id: 1 }]
    const readFn = vi.fn().mockResolvedValue({ data })
    const result = await executeRead({ permission: 'stock:read', readFn })

    expect(readFn).toHaveBeenCalled()
    expect(result).toEqual({ data })
  })

  it('should propagate errors from readFn', async () => {
    const readFn = vi.fn().mockRejectedValue(new Error('DB error'))

    await expect(executeRead({ permission: 'stock:read', readFn })).rejects.toThrow('DB error')
  })
})
