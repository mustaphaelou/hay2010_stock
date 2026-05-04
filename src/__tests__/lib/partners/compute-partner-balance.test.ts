import { describe, it, expect } from 'vitest'
import { formatSoldeCourant, formatPlafondCredit } from '@/lib/partners/compute-partner-balance'

describe('formatSoldeCourant', () => {
  it('should return "0.00 Dhs" for null', () => {
    expect(formatSoldeCourant(null)).toBe('0.00 Dhs')
  })

  it('should return "0.00 Dhs" for undefined', () => {
    expect(formatSoldeCourant(undefined)).toBe('0.00 Dhs')
  })

  it('should return "0 Dhs" when solde is 0', () => {
    expect(formatSoldeCourant(0)).toBe('0 Dhs')
  })

  it('should return formatted positive balance', () => {
    expect(formatSoldeCourant(1500)).toBe('1500 Dhs')
  })

  it('should return formatted negative balance', () => {
    expect(formatSoldeCourant(-300)).toBe('-300 Dhs')
  })
})

describe('formatPlafondCredit', () => {
  it('should return "Non défini" for null', () => {
    expect(formatPlafondCredit(null)).toBe('Non défini')
  })

  it('should return "Non défini" for undefined', () => {
    expect(formatPlafondCredit(undefined)).toBe('Non défini')
  })

  it('should return "0 Dhs" when plafond is 0', () => {
    expect(formatPlafondCredit(0)).toBe('0 Dhs')
  })

  it('should return formatted credit limit', () => {
    expect(formatPlafondCredit(5000)).toBe('5000 Dhs')
  })
})
