import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runInvalidations, type CacheInvalidation } from '@/lib/cache/invalidation'
import { getAdapter } from '@/lib/cache/adapter'
import { CacheNamespaces } from '@/lib/cache/cache'

vi.mock('@/lib/cache/adapter', () => ({
    getAdapter: vi.fn(),
}))

const mockInvalidateNamespace = vi.fn().mockResolvedValue(undefined)
const mockDelete = vi.fn().mockResolvedValue(true)

beforeEach(() => {
    mockInvalidateNamespace.mockClear()
    mockDelete.mockClear()
    vi.mocked(getAdapter).mockReturnValue({
        get: vi.fn(),
        set: vi.fn(),
        delete: mockDelete,
        getOrSet: vi.fn(),
        invalidateNamespace: mockInvalidateNamespace,
        acquireLock: vi.fn(),
        releaseLock: vi.fn(),
    })
})

const ALL_KINDS = [
    'product',
    'stock',
    'partner',
    'document',
    'user',
    'affaire',
    'warehouse',
    'category',
    'dashboard',
    'all',
] as const satisfies ReadonlyArray<CacheInvalidation['kind']>

const PAYLOADS: { [K in CacheInvalidation['kind']]: Extract<CacheInvalidation, { kind: K }> } = {
    product: { kind: 'product' },
    stock: { kind: 'stock' },
    partner: { kind: 'partner' },
    document: { kind: 'document' },
    user: { kind: 'user', userId: 'u-1' },
    affaire: { kind: 'affaire' },
    warehouse: { kind: 'warehouse' },
    category: { kind: 'category' },
    dashboard: { kind: 'dashboard' },
    all: { kind: 'all' },
}

type Namespace = (typeof CacheNamespaces)[keyof typeof CacheNamespaces]

const INVALIDATED: { [K in CacheInvalidation['kind']]: ReadonlyArray<Namespace> } = {
    product: [CacheNamespaces.PRODUCT, CacheNamespaces.STOCK],
    stock: [CacheNamespaces.STOCK],
    partner: [CacheNamespaces.PARTNER],
    document: [CacheNamespaces.DOCUMENT],
    user: [],
    affaire: [CacheNamespaces.AFFAIRE],
    warehouse: [CacheNamespaces.WAREHOUSE, CacheNamespaces.STOCK],
    category: [CacheNamespaces.CATEGORY, CacheNamespaces.PRODUCT],
    dashboard: [CacheNamespaces.DASHBOARD],
    all: [
        CacheNamespaces.PRODUCT,
        CacheNamespaces.STOCK,
        CacheNamespaces.PARTNER,
        CacheNamespaces.DOCUMENT,
        CacheNamespaces.USER,
        CacheNamespaces.DASHBOARD,
        CacheNamespaces.AFFAIRE,
        CacheNamespaces.WAREHOUSE,
        CacheNamespaces.CATEGORY,
    ],
}

describe('cache invalidation domain wiring', () => {
    it.each(ALL_KINDS)(
        'importing lib/cache/invalidation wires a handler for kind "%s"',
        async (kind) => {
            await runInvalidations([PAYLOADS[kind]])

            for (const ns of INVALIDATED[kind]) {
                expect(mockInvalidateNamespace).toHaveBeenCalledWith(ns)
            }
            expect(mockInvalidateNamespace).toHaveBeenCalledTimes(INVALIDATED[kind].length)

            if (kind === 'user') {
                expect(mockDelete).toHaveBeenCalledWith(CacheNamespaces.USER, 'u-1')
                expect(mockDelete).toHaveBeenCalledTimes(1)
            } else {
                expect(mockDelete).not.toHaveBeenCalled()
            }
        }
    )
})
