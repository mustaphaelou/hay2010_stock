import { describe, it, expect, beforeEach, vi } from 'vitest'
import { type ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

import { getNonce } from '@/lib/security/nonce'
import { headers } from 'next/headers'

describe('Nonce', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return existing nonce from x-nonce header', async () => {
    vi.mocked(headers).mockResolvedValue(new Map([['x-nonce', 'existing-nonce']]) as unknown as ReadonlyHeaders)

    const nonce = await getNonce()

    expect(nonce).toBe('existing-nonce')
  })

  it('should generate a new nonce when header is missing', async () => {
    vi.mocked(headers).mockResolvedValue(new Map() as unknown as ReadonlyHeaders)

    const nonce = await getNonce()

    expect(nonce).toBeDefined()
    expect(nonce.length).toBeGreaterThan(0)
    expect(Buffer.from(nonce, 'base64').length).toBe(16)
  })

  it('should generate unique nonces', async () => {
    vi.mocked(headers).mockResolvedValue(new Map() as unknown as ReadonlyHeaders)

    const nonce1 = await getNonce()
    const nonce2 = await getNonce()

    expect(nonce1).not.toBe(nonce2)
  })
})
