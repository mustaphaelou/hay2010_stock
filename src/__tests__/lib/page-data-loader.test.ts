import { describe, it, expect } from 'vitest'
import { loadPageData } from '@/lib/page-data-loader'

describe('loadPageData', () => {
  it('returns data when fetch succeeds with data', async () => {
    const result = await loadPageData(() =>
      Promise.resolve({ data: [{ id: 1, name: 'test' }] })
    )

    expect(result).toEqual({
      data: [{ id: 1, name: 'test' }],
      error: null
    })
  })

  it('returns error when fetch returns error string', async () => {
    const result = await loadPageData(() =>
      Promise.resolve({ data: [], error: 'Service indisponible' })
    )

    expect(result).toEqual({
      data: [],
      error: 'Service indisponible'
    })
  })

  it('returns error when fetch returns both error and data', async () => {
    const result = await loadPageData(() =>
      Promise.resolve({ data: [{ id: 1 }], error: 'Partial error' })
    )

    expect(result.error).toBe('Partial error')
    expect(result.data).toEqual([{ id: 1 }])
  })

  it('returns error when fetch throws an Error', async () => {
    const result = await loadPageData(() =>
      Promise.reject(new Error('Database connection failed'))
    )

    expect(result).toEqual({
      data: [],
      error: 'Database connection failed'
    })
  })

  it('uses custom errorMessage when fetch throws non-Error', async () => {
    const result = await loadPageData(
      () => Promise.reject('string rejection'),
      { errorMessage: 'Erreur réseau' }
    )

    expect(result).toEqual({
      data: [],
      error: 'Erreur réseau'
    })
  })

  it('uses default error message when fetch throws non-Error without custom message', async () => {
    const result = await loadPageData(() => Promise.reject(42))

    expect(result).toEqual({
      data: [],
      error: 'Erreur lors du chargement des données'
    })
  })

  it('returns empty data and error from thrown Error even when errorMessage provided', async () => {
    const result = await loadPageData(
      () => Promise.reject(new Error('DB timeout')),
      { errorMessage: 'Fallback message' }
    )

    expect(result).toEqual({
      data: [],
      error: 'DB timeout'
    })
  })

  it('handles undefined data gracefully', async () => {
    const result = await loadPageData(() => Promise.resolve({}))

    expect(result).toEqual({
      data: [],
      error: null
    })
  })

  it('handles null data gracefully', async () => {
    const result = await loadPageData(() =>
      Promise.resolve({ data: null as unknown as undefined })
    )

    expect(result).toEqual({
      data: [],
      error: null
    })
  })

  it('preserves data type through inference', async () => {
    interface Item { id: number; label: string }

    const result = await loadPageData<Item>(() =>
      Promise.resolve({ data: [{ id: 1, label: 'a' }] })
    )

    const item: Item = result.data[0]
    expect(item.id).toBe(1)
    expect(item.label).toBe('a')
  })
})
