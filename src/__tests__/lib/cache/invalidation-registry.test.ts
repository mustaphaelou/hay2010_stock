import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InvalidationRegistry } from '@/lib/cache/invalidation-registry'

describe('InvalidationRegistry', () => {
    let registry: InvalidationRegistry

    beforeEach(() => {
        registry = new InvalidationRegistry()
    })

    it('runs the registered handler for a matching kind', async () => {
        const handler = vi.fn().mockResolvedValue(undefined)
        registry.register('product', handler)

        await registry.run([{ kind: 'product', productId: 42 }])

        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith({ kind: 'product', productId: 42 })
    })

    it('does nothing when no handler is registered for a kind', async () => {
        await expect(
            registry.run([{ kind: 'product', productId: 1 }])
        ).resolves.toBeUndefined()
    })

    it('dispatches each invalidation to its own handler', async () => {
        const productHandler = vi.fn().mockResolvedValue(undefined)
        const partnerHandler = vi.fn().mockResolvedValue(undefined)
        registry.register('product', productHandler)
        registry.register('partner', partnerHandler)

        await registry.run([
            { kind: 'product', productId: 1 },
            { kind: 'partner', partnerId: 2 },
        ])

        expect(productHandler).toHaveBeenCalledTimes(1)
        expect(partnerHandler).toHaveBeenCalledTimes(1)
    })

    it('allows registering different kinds against the same instance', () => {
        expect(() => {
            registry.register('product', async () => {})
            registry.register('partner', async () => {})
            registry.register('document', async () => {})
        }).not.toThrow()
    })

    it('invokes handlers in the order invalidations are passed', async () => {
        const order: string[] = []
        registry.register('product', async () => {
            order.push('product')
        })
        registry.register('partner', async () => {
            order.push('partner')
        })
        registry.register('document', async () => {
            order.push('document')
        })

        await registry.run([
            { kind: 'product' },
            { kind: 'partner' },
            { kind: 'document' },
        ])

        expect(order).toEqual(['product', 'partner', 'document'])
    })

    it('awaits handlers sequentially — a slow handler blocks the next', async () => {
        let productResolved = false

        registry.register('product', async () => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            productResolved = true
        })
        const partnerHandler = vi.fn().mockImplementation(async () => {
            expect(productResolved).toBe(true)
        })
        registry.register('partner', partnerHandler)

        await registry.run([{ kind: 'product' }, { kind: 'partner' }])

        expect(partnerHandler).toHaveBeenCalledTimes(1)
    })

    it('propagates handler rejection to the caller of run', async () => {
        registry.register('product', async () => {
            throw new Error('handler boom')
        })

        await expect(
            registry.run([{ kind: 'product' }])
        ).rejects.toThrow('handler boom')
    })

    it('does not run subsequent handlers when a handler rejects', async () => {
        registry.register('product', async () => {
            throw new Error('handler boom')
        })
        const partnerHandler = vi.fn().mockResolvedValue(undefined)
        registry.register('partner', partnerHandler)

        await expect(
            registry.run([{ kind: 'product' }, { kind: 'partner' }])
        ).rejects.toThrow('handler boom')

        expect(partnerHandler).not.toHaveBeenCalled()
    })
})

describe('InvalidationRegistry duplicate registration guard', () => {
    const originalNodeEnv = process.env.NODE_ENV
    let registry: InvalidationRegistry

    beforeEach(() => {
        registry = new InvalidationRegistry()
    })

    afterEach(() => {
        if (originalNodeEnv === undefined) {
            delete process.env.NODE_ENV
        } else {
            process.env.NODE_ENV = originalNodeEnv
        }
    })

    it('throws on duplicate kind in non-production (test)', () => {
        process.env.NODE_ENV = 'test'

        registry.register('product', async () => {})

        expect(() => {
            registry.register('product', async () => {})
        }).toThrow(/already registered/)
    })

    it('throws on duplicate kind in non-production (development)', () => {
        process.env.NODE_ENV = 'development'

        registry.register('product', async () => {})

        expect(() => {
            registry.register('product', async () => {})
        }).toThrow(/already registered/)
    })

    it('includes the offending kind in the error message', () => {
        process.env.NODE_ENV = 'test'

        registry.register('user', async () => {})

        expect(() => {
            registry.register('user', async () => {})
        }).toThrow(/'user'/)
    })

    it('does not throw on duplicate kind in production', () => {
        process.env.NODE_ENV = 'production'

        registry.register('product', async () => {})

        expect(() => {
            registry.register('product', async () => {})
        }).not.toThrow()
    })
})
