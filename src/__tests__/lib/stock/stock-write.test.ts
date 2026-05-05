import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockExecuteWrite } = vi.hoisted(() => ({
  mockExecuteWrite: vi.fn(),
}))

vi.mock('@/lib/actions/execute-write', () => ({
  executeWrite: mockExecuteWrite,
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
  })

  it('should delegate to executeWrite with default stock:write permission', async () => {
    mockExecuteWrite.mockResolvedValue({ success: true })
    const writeFn = vi.fn().mockResolvedValue({ success: true })
    await executeStockWrite({ csrfToken: 'token', writeFn })

    expect(mockExecuteWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: 'stock:write',
        csrfToken: 'token',
        writeFn,
      })
    )
  })

  it('should delegate to executeWrite with custom permission', async () => {
    mockExecuteWrite.mockResolvedValue({ success: true })
    const writeFn = vi.fn().mockResolvedValue({ success: true })
    await executeStockWrite({ csrfToken: 'token', writeFn, permission: 'stock:delete' })

    expect(mockExecuteWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: 'stock:delete',
      })
    )
  })

  it('should pass invalidations and revalidatePaths to executeWrite', async () => {
    mockExecuteWrite.mockResolvedValue({ success: true })
    const writeFn = vi.fn().mockResolvedValue({ success: true })
    await executeStockWrite({
      csrfToken: 'token',
      writeFn,
      invalidations: [{ kind: 'product', productId: 1 }],
      revalidatePaths: ['/articles'],
    })

    expect(mockExecuteWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        invalidations: [{ kind: 'product', productId: 1 }],
        revalidatePaths: ['/articles'],
      })
    )
  })

  it('should propagate result from executeWrite', async () => {
    mockExecuteWrite.mockResolvedValue({ success: true, data: { id: 42 } })
    const writeFn = vi.fn().mockResolvedValue({ success: true, data: { id: 42 } })
    const result = await executeStockWrite<{ success: boolean; data: { id: number }; error?: string }>({ csrfToken: 'token', writeFn })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 42 })
  })

  it('should propagate error from executeWrite', async () => {
    mockExecuteWrite.mockResolvedValue({ error: 'Jeton de sécurité invalide' })
    const writeFn = vi.fn().mockResolvedValue({ success: true })
    const result = await executeStockWrite({ csrfToken: 'bad', writeFn })

    expect(result.error).toBe('Jeton de sécurité invalide')
  })
})
