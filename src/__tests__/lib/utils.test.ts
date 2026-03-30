import { describe, it, expect } from 'vitest'
import { cn, formatPrice, formatDate, formatQuantity } from '../../../lib/utils'

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('should handle undefined inputs', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar')
  })

  it('should handle null inputs', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar')
  })

  it('should handle empty strings', () => {
    expect(cn('', 'foo', '')).toBe('foo')
  })

  it('should handle object notation', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('should handle array inputs', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('should handle conflicting tailwind classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('should handle empty input', () => {
    expect(cn()).toBe('')
  })

  it('should handle complex tailwind merge', () => {
    expect(cn('p-4 m-2', 'p-8', 'm-4')).toBe('p-8 m-4')
  })
})

describe('formatPrice', () => {
  it('should format positive numbers', () => {
    const result = formatPrice(100)
    expect(result).toContain('100')
    expect(result).toContain('Dhs')
  })

  it('should format decimal numbers', () => {
    const result = formatPrice(99.99)
    expect(result).toContain('99,99')
    expect(result).toContain('Dhs')
  })

  it('should format zero', () => {
    const result = formatPrice(0)
    expect(result).toContain('0,00')
    expect(result).toContain('Dhs')
  })

  it('should format large numbers', () => {
    const result = formatPrice(1000000)
    expect(result).toContain('1')
    expect(result).toContain('000')
    expect(result).toContain('Dhs')
  })

  it('should return dash for null', () => {
    expect(formatPrice(null)).toBe('-')
  })

  it('should return dash for undefined', () => {
    expect(formatPrice(undefined)).toBe('-')
  })

  it('should format negative numbers', () => {
    const result = formatPrice(-50)
    expect(result).toContain('50')
    expect(result).toContain('-')
  })

  it('should always show two decimal places', () => {
    const result = formatPrice(5)
    expect(result).toContain('5,00')
  })
})

describe('formatDate', () => {
  it('should format Date objects', () => {
    const result = formatDate(new Date('2024-03-15'))
    expect(result).toBe('15/03/2024')
  })

  it('should format ISO date strings', () => {
    const result = formatDate('2024-12-25')
    expect(result).toBe('25/12/2024')
  })

  it('should return dash for null', () => {
    expect(formatDate(null)).toBe('-')
  })

  it('should return dash for undefined', () => {
    expect(formatDate(undefined)).toBe('-')
  })

  it('should return dash for empty string', () => {
    expect(formatDate('')).toBe('-')
  })

  it('should handle date with time component', () => {
    const result = formatDate('2024-06-20T14:30:00')
    expect(result).toBe('20/06/2024')
  })

  it('should handle first day of year', () => {
    const result = formatDate('2024-01-01')
    expect(result).toBe('01/01/2024')
  })

  it('should handle last day of year', () => {
    const result = formatDate('2024-12-31')
    expect(result).toBe('31/12/2024')
  })
})

describe('formatQuantity', () => {
  it('should format whole numbers', () => {
    expect(formatQuantity(100)).toBe('100')
  })

  it('should format decimal numbers with up to 2 decimal places', () => {
    expect(formatQuantity(99.5)).toBe('99,5')
  })

  it('should format numbers with two decimal places', () => {
    expect(formatQuantity(99.99)).toBe('99,99')
  })

  it('should return dash for null', () => {
    expect(formatQuantity(null)).toBe('-')
  })

  it('should return dash for undefined', () => {
    expect(formatQuantity(undefined)).toBe('-')
  })

  it('should format zero', () => {
    expect(formatQuantity(0)).toBe('0')
  })

  it('should format large numbers with separators', () => {
    const result = formatQuantity(1000000)
    expect(result).toBe('1 000 000')
  })

  it('should truncate to 2 decimal places max', () => {
    const result = formatQuantity(123.456)
    expect(result).toBe('123,46')
  })

  it('should format negative numbers', () => {
    const result = formatQuantity(-50)
    expect(result).toContain('-')
    expect(result).toContain('50')
  })
})
