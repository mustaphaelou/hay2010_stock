import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequirePermission } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockValidateActionCsrf } = vi.hoisted(() => ({
  mockValidateActionCsrf: vi.fn().mockResolvedValue(null),
}))

const { mockInvalidateProduct, mockInvalidateStock } = vi.hoisted(() => ({
  mockInvalidateProduct: vi.fn().mockResolvedValue(undefined),
  mockInvalidateStock: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/lib/utils/action-helpers', () => ({
  validateActionCsrf: mockValidateActionCsrf,
}))

vi.mock('@/lib/cache/invalidation', () => ({
  CacheInvalidationService: {
    invalidateProduct: mockInvalidateProduct,
    invalidateStock: mockInvalidateStock,
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

import { executeStockWrite } from '@/lib/stock/stock-write'

describe('executeStockWrite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    mockValidateActionCsrf.mockResolvedValue(null)
  })

  it('should check permission with default stock:write', async () => {
    const writeFn = vi.fn().mockResolvedValue({ success: true } as { success: boolean; error?: undefined })
    await executeStockWrite({ csrfToken: 'token', writeFn })

    expect(mockRequirePermission).toHaveBeenCalledWith('stock:write')
  })

  it('should check custom permission when provided', async () => {
    const writeFn = vi.fn().mockResolvedValue({ success: true } as { success: boolean; error?: undefined })
    await executeStockWrite({ csrfToken: 'token', writeFn, permission: 'stock:delete' })

    expect(mockRequirePermission).toHaveBeenCalledWith('stock:delete')
  })

  it('should throw when permission check fails', async () => {
    mockRequirePermission.mockRejectedValue(new Error('Forbidden'))

    const writeFn = vi.fn().mockResolvedValue({ success: true } as { success: boolean; error?: undefined })
    await expect(executeStockWrite({ csrfToken: 'token', writeFn })).rejects.toThrow('Forbidden')
    expect(writeFn).not.toHaveBeenCalled()
  })

  it('should validate CSRF token with user id', async () => {
    const writeFn = vi.fn().mockResolvedValue({ success: true } as { success: boolean; error?: undefined })
    await executeStockWrite({ csrfToken: 'my-token', writeFn })

    expect(mockValidateActionCsrf).toHaveBeenCalledWith('user-1', 'my-token')
  })

  it('should return CSRF error without calling writeFn', async () => {
    mockValidateActionCsrf.mockResolvedValue('Jeton de sécurité invalide')

    const writeFn = vi.fn().mockResolvedValue({ success: true })
    const result = await executeStockWrite({ csrfToken: 'bad', writeFn })

    expect(result.error).toBe('Jeton de sécurité invalide')
    expect(writeFn).not.toHaveBeenCalled()
  })

  it('should call writeFn with user and return result on success', async () => {
    const writeFn = vi.fn().mockResolvedValue({ success: true, data: { id: 42 } } as { success: boolean; data: { id: number }; error?: undefined })
    const result = await executeStockWrite<{ success: boolean; data: { id: number }; error?: string }>({ csrfToken: 'token', writeFn })

    expect(writeFn).toHaveBeenCalledWith({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 42 })
  })

  it('should skip invalidation and revalidation when result has error', async () => {
    const writeFn = vi.fn().mockResolvedValue({ error: 'Something failed' })
    const result = await executeStockWrite<{ error?: string; success?: boolean }>({
      csrfToken: 'token',
      writeFn,
      invalidations: [{ kind: 'product', productId: 1 }],
      revalidatePaths: ['/articles'],
    })

    expect(result.error).toBe('Something failed')
    expect(mockInvalidateProduct).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('should invalidate product cache when kind is product', async () => {
    const writeFn = vi.fn().mockResolvedValue({ success: true } as { success: boolean; error?: undefined })
    await executeStockWrite({
      csrfToken: 'token',
      writeFn,
      invalidations: [{ kind: 'product', productId: 5 }],
    })

    expect(mockInvalidateProduct).toHaveBeenCalledWith(5)
  })

  it('should invalidate stock cache when kind is stock', async () => {
    const writeFn = vi.fn().mockResolvedValue({ success: true } as { success: boolean; error?: undefined })
    await executeStockWrite({
      csrfToken: 'token',
      writeFn,
      invalidations: [{ kind: 'stock', productId: 3, warehouseId: 7 }],
    })

    expect(mockInvalidateStock).toHaveBeenCalledWith(3, 7)
  })

  it('should revalidate all specified paths', async () => {
    const writeFn = vi.fn().mockResolvedValue({ success: true } as { success: boolean; error?: undefined })
    await executeStockWrite({
      csrfToken: 'token',
      writeFn,
      revalidatePaths: ['/articles', '/stock'],
    })

    expect(mockRevalidatePath).toHaveBeenCalledWith('/articles')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/stock')
  })

  it('should run invalidations and revalidations inside after()', async () => {
    const afterCalls: Array<() => void | Promise<void>> = []
    mockAfter.mockImplementation((fn: () => void | Promise<void>) => { afterCalls.push(fn) })

    const writeFn = vi.fn().mockResolvedValue({ success: true } as { success: boolean; error?: undefined })
    await executeStockWrite({
      csrfToken: 'token',
      writeFn,
      invalidations: [{ kind: 'product', productId: 1 }],
      revalidatePaths: ['/articles'],
    })

    expect(mockInvalidateProduct).not.toHaveBeenCalled()

    for (const fn of afterCalls) {
      await fn()
    }
    expect(mockInvalidateProduct).toHaveBeenCalledWith(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/articles')
  })
})
