import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUserFindUnique, mockUserUpdate } = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserUpdate: vi.fn(),
}))

const { mockVerifyPassword } = vi.hoisted(() => ({
  mockVerifyPassword: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
}))

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: mockVerifyPassword,
  hashPassword: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { updateUserProfile, getUserProfile } from '@/lib/auth/profile-service'

describe('Profile Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserProfile', () => {
    it('should return user profile for valid userId', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: null,
      })

      const result = await getUserProfile('user-1')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data?.email).toBe('user@test.com')
      expect(result.data?.name).toBe('Test User')
    })

    it('should return error for non-existent user', async () => {
      mockUserFindUnique.mockResolvedValue(null)

      const result = await getUserProfile('nonexistent')

      expect(result.error).toBe('Utilisateur introuvable.')
      expect(result.data).toBeUndefined()
    })
  })

  describe('updateUserProfile', () => {
    it('should update name without password when email unchanged', async () => {
      mockUserFindUnique.mockImplementation((args: Parameters<typeof mockUserFindUnique>[0]) => {
        if (args?.where?.id) {
          return Promise.resolve({ id: 'user-1', password: 'hashed', email: 'user@test.com' })
        }
        return Promise.resolve(null)
      })
      mockUserUpdate.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        name: 'New Name',
        role: 'USER',
        createdAt: new Date(),
        lastLoginAt: null,
      })

      const result = await updateUserProfile('user-1', 'New Name', 'user@test.com')

      expect(result.error).toBeUndefined()
      expect(result.data?.name).toBe('New Name')
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'New Name', email: 'user@test.com' },
        select: expect.objectContaining({
          id: true, email: true, name: true, role: true,
        }),
      })
    })

    it('should update email with valid current password', async () => {
      mockUserFindUnique.mockImplementation((args: Parameters<typeof mockUserFindUnique>[0]) => {
        if (args?.where?.id) {
          return Promise.resolve({ id: 'user-1', password: 'hashed', email: 'old@test.com' })
        }
        if (args?.where && 'email' in args.where && args.where.email === 'new@test.com') {
          return Promise.resolve(null)
        }
        return Promise.resolve(null)
      })
      mockVerifyPassword.mockResolvedValue(true)
      mockUserUpdate.mockResolvedValue({
        id: 'user-1',
        email: 'new@test.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date(),
        lastLoginAt: null,
      })

      const result = await updateUserProfile('user-1', 'Test User', 'new@test.com', 'correct-pass')

      expect(result.error).toBeUndefined()
      expect(result.data?.email).toBe('new@test.com')
      expect(mockVerifyPassword).toHaveBeenCalledWith('correct-pass', 'hashed')
    })

    it('should reject email change with wrong password', async () => {
      mockUserFindUnique.mockImplementation((args: Parameters<typeof mockUserFindUnique>[0]) => {
        if (args?.where?.id) {
          return Promise.resolve({ id: 'user-1', password: 'hashed', email: 'old@test.com' })
        }
        return Promise.resolve(null)
      })
      mockVerifyPassword.mockResolvedValue(false)

      const result = await updateUserProfile('user-1', 'Test User', 'new@test.com', 'wrong-pass')

      expect(result.error).toBe('Mot de passe actuel incorrect.')
    })

    it('should reject duplicate email', async () => {
      mockUserFindUnique.mockImplementation((args: Parameters<typeof mockUserFindUnique>[0]) => {
        if (args?.where?.id) {
          return Promise.resolve({ id: 'user-1', password: 'hashed', email: 'old@test.com' })
        }
        if (args?.where && 'email' in args.where && args.where.email === 'taken@test.com') {
          return Promise.resolve({ id: 'other-user', email: 'taken@test.com' })
        }
        return Promise.resolve(null)
      })
      mockVerifyPassword.mockResolvedValue(true)

      const result = await updateUserProfile('user-1', 'Test User', 'taken@test.com', 'correct-pass')

      expect(result.error).toContain('déjà utilisée')
    })

    it('should return error when user not found', async () => {
      mockUserFindUnique.mockResolvedValue(null)

      const result = await updateUserProfile('nonexistent', 'Name', 'email@test.com')

      expect(result.error).toBe('Utilisateur introuvable.')
    })
  })
})
