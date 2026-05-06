import { describe, it, expect } from 'vitest'
import { getAffairesSchema, getAffaireByCodeSchema } from '@/lib/affaires/validation'

describe('getAffairesSchema', () => {
  it('should accept empty object (all fields optional)', () => {
    const result = getAffairesSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should accept valid pagination', () => {
    const result = getAffairesSchema.safeParse({ page: 1, limit: 50 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(50)
    }
  })

  it('should accept optional filter fields', () => {
    const result = getAffairesSchema.safeParse({
      type_affaire: 'Proposition',
      statut_affaire: 'En cours',
      search: 'project',
      est_actif: true,
    })
    expect(result.success).toBe(true)
  })

  it('should reject page less than 1', () => {
    const result = getAffairesSchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })

  it('should reject limit greater than 100', () => {
    const result = getAffairesSchema.safeParse({ limit: 101 })
    expect(result.success).toBe(false)
  })

  it('should reject non-integer page', () => {
    const result = getAffairesSchema.safeParse({ page: 1.5 })
    expect(result.success).toBe(false)
  })
})

describe('getAffaireByCodeSchema', () => {
  it('should accept valid code_affaire', () => {
    const result = getAffaireByCodeSchema.safeParse({ code_affaire: 'AFF-001' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code_affaire).toBe('AFF-001')
    }
  })

  it('should reject empty code_affaire', () => {
    const result = getAffaireByCodeSchema.safeParse({ code_affaire: '' })
    expect(result.success).toBe(false)
  })

  it('should reject missing code_affaire', () => {
    const result = getAffaireByCodeSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('should accept code_affaire up to 50 chars', () => {
    const result = getAffaireByCodeSchema.safeParse({ code_affaire: 'A'.repeat(50) })
    expect(result.success).toBe(true)
  })

  it('should reject code_affaire longer than 50 chars', () => {
    const result = getAffaireByCodeSchema.safeParse({ code_affaire: 'A'.repeat(51) })
    expect(result.success).toBe(false)
  })
})
