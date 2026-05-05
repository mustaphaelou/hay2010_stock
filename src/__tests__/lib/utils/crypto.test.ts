/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'

describe('randomBytesHex', () => {
  it('should return a hex string of double the input byte count', async () => {
    const { randomBytesHex } = await import('@/lib/utils/crypto')

    const result = randomBytesHex(16)

    expect(result).toHaveLength(32)
  })

  it('should return only valid hex characters', async () => {
    const { randomBytesHex } = await import('@/lib/utils/crypto')

    const result = randomBytesHex(16)

    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('should produce different values on consecutive calls', async () => {
    const { randomBytesHex } = await import('@/lib/utils/crypto')

    const a = randomBytesHex(16)
    const b = randomBytesHex(16)

    expect(a).not.toBe(b)
  })

  it('should return an empty string for zero bytes', async () => {
    const { randomBytesHex } = await import('@/lib/utils/crypto')

    const result = randomBytesHex(0)

    expect(result).toBe('')
  })

  it('should handle various byte lengths', async () => {
    const { randomBytesHex } = await import('@/lib/utils/crypto')

    expect(randomBytesHex(1)).toHaveLength(2)
    expect(randomBytesHex(4)).toHaveLength(8)
    expect(randomBytesHex(32)).toHaveLength(64)
  })
})
