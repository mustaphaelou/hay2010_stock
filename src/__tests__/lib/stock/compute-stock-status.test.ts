import { describe, it, expect } from 'vitest'
import { getStockStatusVariant } from '@/lib/stock/compute-stock-status'

describe('getStockStatusVariant', () => {
  it('should return "destructive" when stock is 0', () => {
    expect(getStockStatusVariant(0, 5)).toBe('destructive')
  })

  it('should return "destructive" when stock is negative', () => {
    expect(getStockStatusVariant(-3, 5)).toBe('destructive')
  })

  it('should return "warning" when stock equals stockMinimum', () => {
    expect(getStockStatusVariant(5, 5)).toBe('warning')
  })

  it('should return "warning" when stock is below stockMinimum but above 0', () => {
    expect(getStockStatusVariant(3, 5)).toBe('warning')
  })

  it('should return "success" when stock is above stockMinimum', () => {
    expect(getStockStatusVariant(10, 5)).toBe('success')
  })

  it('should return "destructive" when stockMinimum is 0 and stock is 0', () => {
    expect(getStockStatusVariant(0, 0)).toBe('destructive')
  })

  it('should return "success" when stockMinimum is 0 and stock is positive', () => {
    expect(getStockStatusVariant(1, 0)).toBe('success')
  })

  it('should return "warning" for large stockMinimum with small positive stock', () => {
    expect(getStockStatusVariant(50, 100)).toBe('warning')
  })
})
