import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequireAuth } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn().mockResolvedValue({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' }),
}))

const { mockExecuteWrite } = vi.hoisted(() => ({
  mockExecuteWrite: vi.fn(),
}))

const { mockVerifyPassword } = vi.hoisted(() => ({
  mockVerifyPassword: vi.fn().mockResolvedValue(true),
}))

const { mockUserFindUnique, mockUserUpdate } = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserUpdate: vi.fn().mockResolvedValue({ id: 'user-1' }),
}))

vi.mock('@/lib/auth/user-utils', () => ({
  requireAuth: mockRequireAuth,
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' }),
}))

vi.mock('@/lib/actions/execute-write', () => ({
  executeWrite: mockExecuteWrite,
}))

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: mockVerifyPassword,
  hashPassword: vi.fn().mockResolvedValue('hashed'),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('next/server', () => ({
  after: vi.fn((fn) => fn()),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

import { updateProfile, getUserProfile } from '@/app/actions/profile'

function createFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value)
  }
  return fd
}

describe('Profile Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' })
  })

  describe('updateProfile', () => {
    it('should call executeWrite with authenticated permission and csrfToken', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: (_user: unknown) => Promise<unknown> }) => {
        return options.writeFn({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' })
      })
      mockUserFindUnique.mockResolvedValue(null)

      const fd = createFormData({ name: 'New Name', email: 'user@test.com', csrfToken: 'valid-token' })
      const result = await updateProfile(fd)

      expect(mockExecuteWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          permission: 'authenticated',
          csrfToken: 'valid-token',
        })
      )
      expect(result.success).toBe(true)
    })

    it('should return CSRF error when executeWrite returns CSRF error', async () => {
      mockExecuteWrite.mockResolvedValue({ error: 'Jeton de sécurité invalide. Veuillez actualiser la page et réessayer.' })

      const fd = createFormData({ name: 'Test User', email: 'user@test.com', csrfToken: 'bad-token' })
      const result = await updateProfile(fd)

      expect(result.error).toContain('Jeton de sécurité invalide')
    })

    it('should return validation error when executeWrite returns validation error', async () => {
      mockExecuteWrite.mockResolvedValue({ error: 'Le nom doit contenir au moins 2 caractères' })

      const fd = createFormData({ name: 'A', email: 'user@test.com', csrfToken: 'valid-token' })
      const result = await updateProfile(fd)

      expect(result.error).toBeDefined()
    })

    it('should require current password when changing email inside writeFn', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: (_user: unknown) => Promise<unknown> }) => {
        return options.writeFn({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' })
      })

      const fd = new FormData()
      fd.set('name', 'Test User')
      fd.set('email', 'newemail@test.com')
      fd.set('csrfToken', 'valid-token')

      const result = await updateProfile(fd)

      expect(result.error).toContain('mot de passe actuel')
    })

    it('should reject wrong current password when changing email inside writeFn', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: (_user: unknown) => Promise<unknown> }) => {
        return options.writeFn({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' })
      })
      mockUserFindUnique.mockImplementation((args: Parameters<typeof mockUserFindUnique>[0]) => {
        if (args?.where?.id) {
          return Promise.resolve({ id: 'user-1', password: 'hashed-pw', email: 'user@test.com' })
        }
        return Promise.resolve(null)
      })
      mockVerifyPassword.mockResolvedValue(false)

      const fd = new FormData()
      fd.set('name', 'Test User')
      fd.set('email', 'newemail@test.com')
      fd.set('csrfToken', 'valid-token')
      fd.set('currentPassword', 'wrong-pass')

      const result = await updateProfile(fd)

      expect(result.error).toContain('Mot de passe actuel incorrect')
    })

    it('should reject email already in use by another account inside writeFn', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: (_user: unknown) => Promise<unknown> }) => {
        return options.writeFn({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' })
      })
      mockUserFindUnique.mockImplementation((args: Parameters<typeof mockUserFindUnique>[0]) => {
        if (args?.where?.id) {
          return Promise.resolve({ id: 'user-1', password: 'hashed-pw', email: 'user@test.com' })
        }
        if (args?.where && 'email' in args.where && args.where.email === 'taken@test.com') {
          return Promise.resolve({ id: 'other-user', email: 'taken@test.com' })
        }
        return Promise.resolve(null)
      })
      mockVerifyPassword.mockResolvedValue(true)

      const fd = new FormData()
      fd.set('name', 'Test User')
      fd.set('email', 'taken@test.com')
      fd.set('csrfToken', 'valid-token')
      fd.set('currentPassword', 'correct-pass')

      const result = await updateProfile(fd)

      expect(result.error).toContain('déjà utilisée')
    })

    it('should update profile successfully', async () => {
      mockExecuteWrite.mockImplementation(async (options: { writeFn: (_user: unknown) => Promise<unknown> }) => {
        return options.writeFn({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' })
      })
      mockUserFindUnique.mockResolvedValue(null)

      const fd = new FormData()
      fd.set('name', 'New Name')
      fd.set('email', 'user@test.com')
      fd.set('csrfToken', 'valid-token')

      const result = await updateProfile(fd)

      expect(result.success).toBe(true)
      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ name: 'New Name', email: 'user@test.com' }),
        })
      )
    })
  })

  describe('getUserProfile', () => {
    it('should return null when user not found in DB', async () => {
      mockUserFindUnique.mockResolvedValue(null)

      const result = await getUserProfile()

      expect(result).toBeNull()
    })

    it('should return user profile', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date(),
        lastLoginAt: null,
      })

      const result = await getUserProfile()

      expect(result).not.toBeNull()
      expect(result?.email).toBe('user@test.com')
    })

    it('should return null on error', async () => {
      mockUserFindUnique.mockRejectedValue(new Error('DB error'))

      const result = await getUserProfile()

      expect(result).toBeNull()
    })
  })
})
