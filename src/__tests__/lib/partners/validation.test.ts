import { describe, it, expect } from 'vitest'
import { getPartnersSchema, createPartnerSchema, updatePartnerSchema, deletePartnerSchema } from '@/lib/partners/validation'

describe('getPartnersSchema', () => {
  describe('success cases', () => {
    it('should validate with all valid enum values', () => {
      const enumValues = ['CLIENT', 'FOURNISSEUR', 'LES_DEUX', 'all'] as const
      enumValues.forEach(type => {
        const result = getPartnersSchema.safeParse({ type })
        expect(result.success).toBe(true)
      })
    })

    it('should accept valid pagination parameters', () => {
      const result = getPartnersSchema.safeParse({
        type: 'CLIENT',
        page: 1,
        limit: 50,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('CLIENT')
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(50)
      }
    })

    it('should accept limit at max value (100)', () => {
      const result = getPartnersSchema.safeParse({
        type: 'CLIENT',
        limit: 100,
      })
      expect(result.success).toBe(true)
    })

    it('should accept limit at min value (1)', () => {
      const result = getPartnersSchema.safeParse({
        type: 'CLIENT',
        limit: 1,
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty object (all fields optional)', () => {
      const result = getPartnersSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should omit undefined type', () => {
      const result = getPartnersSchema.safeParse({ type: undefined })
      expect(result.success).toBe(true)
    })
  })

  describe('failure cases', () => {
    it('should reject invalid enum value', () => {
      const result = getPartnersSchema.safeParse({
        type: 'INVALID_TYPE',
      })
      expect(result.success).toBe(false)
    })

    it('should reject page less than 1', () => {
      const result = getPartnersSchema.safeParse({
        page: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative page', () => {
      const result = getPartnersSchema.safeParse({
        page: -1,
      })
      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const result = getPartnersSchema.safeParse({
        limit: 101,
      })
      expect(result.success).toBe(false)
    })

    it('should reject limit less than 1', () => {
      const result = getPartnersSchema.safeParse({
        limit: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer page', () => {
      const result = getPartnersSchema.safeParse({
        page: 1.5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer limit', () => {
      const result = getPartnersSchema.safeParse({
        limit: 50.5,
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('createPartnerSchema', () => {
  const validPartner = {
    code_partenaire: 'CLI-001',
    nom_partenaire: 'Test Partner',
    type_partenaire: 'CLIENT',
  }

  it('should accept minimal required fields', () => {
    const result = createPartnerSchema.safeParse(validPartner)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code_partenaire).toBe('CLI-001')
      expect(result.data.nom_partenaire).toBe('Test Partner')
      expect(result.data.type_partenaire).toBe('CLIENT')
    }
  })

  it('should accept all optional fields', () => {
    const result = createPartnerSchema.safeParse({
      ...validPartner,
      adresse_email: 'test@example.com',
      numero_telephone: '0600000000',
      ville: 'Casablanca',
      pays: 'Maroc',
      est_actif: true,
      est_bloque: false,
    })
    expect(result.success).toBe(true)
  })

  it('should accept all TypePartenaire enum values', () => {
    const enumValues = ['CLIENT', 'FOURNISSEUR', 'LES_DEUX'] as const
    enumValues.forEach(type => {
      const result = createPartnerSchema.safeParse({ ...validPartner, type_partenaire: type })
      expect(result.success).toBe(true)
    })
  })

  it('should apply default values', () => {
    const result = createPartnerSchema.safeParse(validPartner)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type_partenaire).toBe('CLIENT')
      expect(result.data.est_actif).toBe(true)
      expect(result.data.est_bloque).toBe(false)
    }
  })

  describe('failure cases', () => {
    it('should reject missing code_partenaire', () => {
      const result = createPartnerSchema.safeParse({ nom_partenaire: 'Test', type_partenaire: 'CLIENT' })
      expect(result.success).toBe(false)
    })

    it('should reject missing nom_partenaire', () => {
      const result = createPartnerSchema.safeParse({ code_partenaire: 'CLI-001', type_partenaire: 'CLIENT' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid type_partenaire', () => {
      const result = createPartnerSchema.safeParse({ ...validPartner, type_partenaire: 'INVALID' })
      expect(result.success).toBe(false)
    })

    it('should reject code_partenaire longer than 50 chars', () => {
      const result = createPartnerSchema.safeParse({ ...validPartner, code_partenaire: 'A'.repeat(51) })
      expect(result.success).toBe(false)
    })

    it('should reject empty code_partenaire', () => {
      const result = createPartnerSchema.safeParse({ ...validPartner, code_partenaire: '' })
      expect(result.success).toBe(false)
    })

    it('should reject empty nom_partenaire', () => {
      const result = createPartnerSchema.safeParse({ ...validPartner, nom_partenaire: '' })
      expect(result.success).toBe(false)
    })

    it('should reject non-boolean est_actif', () => {
      const result = createPartnerSchema.safeParse({ ...validPartner, est_actif: 'yes' })
      expect(result.success).toBe(false)
    })
  })
})

describe('updatePartnerSchema', () => {
  it('should accept empty object (all fields optional)', () => {
    const result = updatePartnerSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should accept partial updates', () => {
    const result = updatePartnerSchema.safeParse({ nom_partenaire: 'Updated Name' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nom_partenaire).toBe('Updated Name')
    }
  })

  it('should validate fields when provided', () => {
    const result = updatePartnerSchema.safeParse({ type_partenaire: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('should accept code_partenaire update', () => {
    const result = updatePartnerSchema.safeParse({ code_partenaire: 'NEW-CODE' })
    expect(result.success).toBe(true)
  })
})

describe('deletePartnerSchema', () => {
  it('should accept valid positive integer id', () => {
    const result = deletePartnerSchema.safeParse({ id_partenaire: 1 })
    expect(result.success).toBe(true)
  })

  it('should reject missing id_partenaire', () => {
    const result = deletePartnerSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('should reject zero id', () => {
    const result = deletePartnerSchema.safeParse({ id_partenaire: 0 })
    expect(result.success).toBe(false)
  })

  it('should reject negative id', () => {
    const result = deletePartnerSchema.safeParse({ id_partenaire: -1 })
    expect(result.success).toBe(false)
  })

  it('should reject float id', () => {
    const result = deletePartnerSchema.safeParse({ id_partenaire: 1.5 })
    expect(result.success).toBe(false)
  })
})
