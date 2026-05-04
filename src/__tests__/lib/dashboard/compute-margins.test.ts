import { describe, it, expect } from 'vitest'
import { computeGrossMargin, computeUnpaidInvoices, isPaymentComplete } from '@/lib/dashboard/compute-margins'

describe('computeGrossMargin', () => {
  it('should compute margin when both values are provided', () => {
    expect(computeGrossMargin(10000, 7000)).toBe(3000)
  })

  it('should treat undefined totalSalesAmount as 0', () => {
    expect(computeGrossMargin(undefined, 5000)).toBe(-5000)
  })

  it('should treat undefined totalPurchasesAmount as 0', () => {
    expect(computeGrossMargin(10000, undefined)).toBe(10000)
  })

  it('should treat null totalSalesAmount as 0', () => {
    expect(computeGrossMargin(null, 5000)).toBe(-5000)
  })

  it('should treat null totalPurchasesAmount as 0', () => {
    expect(computeGrossMargin(10000, null)).toBe(10000)
  })

  it('should return 0 when both values are undefined', () => {
    expect(computeGrossMargin(undefined, undefined)).toBe(0)
  })

  it('should return 0 when both values are 0', () => {
    expect(computeGrossMargin(0, 0)).toBe(0)
  })

  it('should handle negative margin (sales < purchases)', () => {
    expect(computeGrossMargin(3000, 5000)).toBe(-2000)
  })
})

describe('computeUnpaidInvoices', () => {
  it('should return zero count and total for empty array', () => {
    expect(computeUnpaidInvoices([])).toEqual({ count: 0, total: 0 })
  })

  it('should return zero when all invoices are fully paid', () => {
    const invoices = [
      { montant_ttc: 1000, montant_regle: 1000 },
      { montant_ttc: 2000, montant_regle: 2000 },
    ]
    expect(computeUnpaidInvoices(invoices)).toEqual({ count: 0, total: 0 })
  })

  it('should return zero when invoices are overpaid', () => {
    const invoices = [
      { montant_ttc: 1000, montant_regle: 1500 },
    ]
    expect(computeUnpaidInvoices(invoices)).toEqual({ count: 0, total: 0 })
  })

  it('should count and total unpaid invoices', () => {
    const invoices = [
      { montant_ttc: 1000, montant_regle: 600 },
      { montant_ttc: 2000, montant_regle: 500 },
    ]
    expect(computeUnpaidInvoices(invoices)).toEqual({ count: 2, total: 1900 })
  })

  it('should handle mixed paid and unpaid invoices', () => {
    const invoices = [
      { montant_ttc: 1000, montant_regle: 1000 },
      { montant_ttc: 2000, montant_regle: 0 },
    ]
    expect(computeUnpaidInvoices(invoices)).toEqual({ count: 1, total: 2000 })
  })

  it('should handle Prisma Decimal montant_ttc objects', () => {
    const decimalMock = { toNumber: () => 5000 }
    const invoices = [
      { montant_ttc: decimalMock, montant_regle: 1000 },
    ]
    expect(computeUnpaidInvoices(invoices)).toEqual({ count: 1, total: 4000 })
  })
})

describe('isPaymentComplete', () => {
  it('should return true when montant_regle equals montant_ttc', () => {
    expect(isPaymentComplete(1000, 1000)).toBe(true)
  })

  it('should return true when montant_regle exceeds montant_ttc', () => {
    expect(isPaymentComplete(1500, 1000)).toBe(true)
  })

  it('should return false when montant_regle is less than montant_ttc', () => {
    expect(isPaymentComplete(500, 1000)).toBe(false)
  })

  it('should treat undefined montant_regle as 0', () => {
    expect(isPaymentComplete(undefined, 1000)).toBe(false)
    expect(isPaymentComplete(undefined, 0)).toBe(true)
  })

  it('should treat undefined montant_ttc as 0', () => {
    expect(isPaymentComplete(1000, undefined)).toBe(true)
  })

  it('should treat null values as 0', () => {
    expect(isPaymentComplete(null, null)).toBe(true)
    expect(isPaymentComplete(null, 100)).toBe(false)
  })

  it('should return true when both values are 0', () => {
    expect(isPaymentComplete(0, 0)).toBe(true)
  })
})
