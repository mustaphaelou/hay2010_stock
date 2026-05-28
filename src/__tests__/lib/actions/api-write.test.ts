import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRunInvalidations } = vi.hoisted(() => ({
  mockRunInvalidations: vi.fn(),
}))

vi.mock('@/lib/cache/invalidation', () => ({
  runInvalidations: mockRunInvalidations,
}))

import { apiWrite } from '@/lib/actions/api-write'

const mockUser = { id: 'api-user-1', email: '', name: '', role: 'ADMIN' as const }

describe('apiWrite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should execute writeFn with user and return result', async () => {
    const writeFn = vi.fn().mockResolvedValue({ data: { id: 42 } })
    const result = await apiWrite(mockUser, writeFn)

    expect(writeFn).toHaveBeenCalledWith(mockUser)
    expect(result).toEqual({ data: { id: 42 } })
  })

  it('should propagate thrown errors from writeFn', async () => {
    const writeFn = vi.fn().mockRejectedValue(new Error('DB error'))

    await expect(apiWrite(mockUser, writeFn)).rejects.toThrow('DB error')
  })

  it('should return { error } when writeFn returns error', async () => {
    const writeFn = vi.fn().mockResolvedValue({ error: 'Something failed' })
    const result = await apiWrite(mockUser, writeFn)

    expect(result).toEqual({ error: 'Something failed' })
  })

  it('should run invalidations on success when provided', async () => {
    const writeFn = vi.fn().mockResolvedValue({ data: { id: 1 } })
    await apiWrite(mockUser, writeFn, [{ kind: 'product', productId: 1 }])

    expect(mockRunInvalidations).toHaveBeenCalledWith([{ kind: 'product', productId: 1 }])
  })

  it('should skip invalidations when writeFn returns error', async () => {
    const writeFn = vi.fn().mockResolvedValue({ error: 'Failed' })
    await apiWrite(mockUser, writeFn, [{ kind: 'product', productId: 1 }])

    expect(mockRunInvalidations).not.toHaveBeenCalled()
  })

  it('should skip invalidations when none provided', async () => {
    const writeFn = vi.fn().mockResolvedValue({ data: { id: 1 } })
    await apiWrite(mockUser, writeFn)

    expect(mockRunInvalidations).not.toHaveBeenCalled()
  })

  it('should skip invalidations when empty array provided', async () => {
    const writeFn = vi.fn().mockResolvedValue({ data: { id: 1 } })
    await apiWrite(mockUser, writeFn, [])

    expect(mockRunInvalidations).not.toHaveBeenCalled()
  })
})
