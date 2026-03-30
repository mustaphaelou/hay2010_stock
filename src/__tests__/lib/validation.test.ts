import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerSchema,
  toggleArticleStatusSchema,
  getDocLinesSchema,
  getPartnersSchema,
  paginationSchema,
} from '../../../lib/validation'

describe('loginSchema', () => {
  describe('success cases', () => {
    it('should validate valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.password).toBe('password123')
      }
    })

    it('should accept valid email with subdomain', () => {
      const result = loginSchema.safeParse({
        email: 'user@mail.example.com',
        password: 'pass',
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid email with plus addressing', () => {
      const result = loginSchema.safeParse({
        email: 'user+tag@example.com',
        password: 'pass',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('failure cases', () => {
    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Adresse email invalide')
      }
    })

    it('should reject missing email', () => {
      const result = loginSchema.safeParse({
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le mot de passe est requis')
      }
    })

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
      })
      expect(result.success).toBe(false)
    })

    it('should reject email without TLD', () => {
      const result = loginSchema.safeParse({
        email: 'test@',
        password: 'password123',
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('registerSchema', () => {
  describe('success cases', () => {
    it('should validate valid registration data', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        name: 'John Doe',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.password).toBe('Password123')
        expect(result.data.name).toBe('John Doe')
      }
    })

    it('should accept password with special characters', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123!@#$%',
        name: 'John',
      })
      expect(result.success).toBe(true)
    })

    it('should accept name with minimum length of 2', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Jo',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('failure cases - password validation', () => {
    it('should reject password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Pass1',
        name: 'John',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Le mot de passe doit contenir au moins 8 caractères')).toBe(true)
      }
    })

    it('should reject password without uppercase letter', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        name: 'John',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Le mot de passe doit contenir au moins une lettre majuscule')).toBe(true)
      }
    })

    it('should reject password without lowercase letter', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'PASSWORD123',
        name: 'John',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Le mot de passe doit contenir au moins une lettre minuscule')).toBe(true)
      }
    })

    it('should reject password without number', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password',
        name: 'John',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Le mot de passe doit contenir au moins un chiffre')).toBe(true)
      }
    })

    it('should reject password longer than 100 characters', () => {
      const longPassword = 'Password1' + 'a'.repeat(92)
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: longPassword,
        name: 'John',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Le mot de passe ne peut pas dépasser 100 caractères')).toBe(true)
      }
    })
  })

  describe('failure cases - other fields', () => {
    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'invalid-email',
        password: 'Password123',
        name: 'John',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Adresse email invalide')
      }
    })

    it('should reject name shorter than 2 characters', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        name: 'J',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Le nom doit contenir au moins 2 caractères')
      }
    })

		it('should reject missing fields', () => {
			const result = registerSchema.safeParse({})
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues.length).toBeGreaterThanOrEqual(3)
			}
		})
  })
})

describe('toggleArticleStatusSchema', () => {
  describe('success cases', () => {
    it('should validate valid product ID and status', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 1,
        newStatus: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id_produit).toBe(1)
        expect(result.data.newStatus).toBe(true)
      }
    })

    it('should accept large positive integer', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 999999,
        newStatus: false,
      })
      expect(result.success).toBe(true)
    })

    it('should accept false as newStatus', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 5,
        newStatus: false,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.newStatus).toBe(false)
      }
    })
  })

  describe('failure cases', () => {
    it('should reject zero as product ID', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 0,
        newStatus: true,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Product ID must be a positive integer')
      }
    })

    it('should reject negative product ID', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: -1,
        newStatus: true,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer product ID', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 1.5,
        newStatus: true,
      })
      expect(result.success).toBe(false)
    })

    it('should reject string as product ID', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: '1',
        newStatus: true,
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing newStatus', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 1,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-boolean newStatus', () => {
      const result = toggleArticleStatusSchema.safeParse({
        id_produit: 1,
        newStatus: 'true',
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('getDocLinesSchema', () => {
  describe('success cases', () => {
    it('should validate valid document ID', () => {
      const result = getDocLinesSchema.safeParse({
        docId: 1,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.docId).toBe(1)
      }
    })

    it('should accept large positive integer', () => {
      const result = getDocLinesSchema.safeParse({
        docId: 999999,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('failure cases', () => {
    it('should reject zero as document ID', () => {
      const result = getDocLinesSchema.safeParse({
        docId: 0,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Document ID must be a positive integer')
      }
    })

    it('should reject negative document ID', () => {
      const result = getDocLinesSchema.safeParse({
        docId: -5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer document ID', () => {
      const result = getDocLinesSchema.safeParse({
        docId: 1.5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject string document ID', () => {
      const result = getDocLinesSchema.safeParse({
        docId: '123',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing document ID', () => {
      const result = getDocLinesSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })
})

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

describe('paginationSchema', () => {
  describe('success cases', () => {
    it('should apply default values when not provided', () => {
      const result = paginationSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(50)
      }
    })

    it('should accept valid page and limit', () => {
      const result = paginationSchema.safeParse({
        page: 2,
        limit: 25,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(25)
      }
    })

    it('should accept page at minimum value (1)', () => {
      const result = paginationSchema.safeParse({
        page: 1,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
      }
    })

    it('should accept limit at minimum value (1)', () => {
      const result = paginationSchema.safeParse({
        limit: 1,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(1)
      }
    })

    it('should accept limit at maximum value (100)', () => {
      const result = paginationSchema.safeParse({
        limit: 100,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(100)
      }
    })

    it('should apply default for missing page', () => {
      const result = paginationSchema.safeParse({
        limit: 25,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(25)
      }
    })

    it('should apply default for missing limit', () => {
      const result = paginationSchema.safeParse({
        page: 5,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(5)
        expect(result.data.limit).toBe(50)
      }
    })
  })

  describe('failure cases', () => {
    it('should reject page less than 1', () => {
      const result = paginationSchema.safeParse({
        page: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative page', () => {
      const result = paginationSchema.safeParse({
        page: -5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const result = paginationSchema.safeParse({
        limit: 101,
      })
      expect(result.success).toBe(false)
    })

    it('should reject limit less than 1', () => {
      const result = paginationSchema.safeParse({
        limit: 0,
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative limit', () => {
      const result = paginationSchema.safeParse({
        limit: -10,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer page', () => {
      const result = paginationSchema.safeParse({
        page: 2.5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-integer limit', () => {
      const result = paginationSchema.safeParse({
        limit: 25.5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject string page', () => {
      const result = paginationSchema.safeParse({
        page: '2',
      })
      expect(result.success).toBe(false)
    })

    it('should reject string limit', () => {
      const result = paginationSchema.safeParse({
        limit: '50',
      })
      expect(result.success).toBe(false)
    })
  })
})
