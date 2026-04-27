import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema } from '@/lib/auth/validation'

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
