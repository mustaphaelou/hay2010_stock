import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequireAuth } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn().mockResolvedValue({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' }),
}))

const { mockServerActionWrite } = vi.hoisted(() => ({
  mockServerActionWrite: vi.fn(),
}))

const { mockUpdateUserProfile, mockGetUserProfile } = vi.hoisted(() => ({
  mockUpdateUserProfile: vi.fn().mockResolvedValue({ success: true }),
  mockGetUserProfile: vi.fn(),
}))

vi.mock('@/lib/auth/user-utils', () => ({
  requireAuth: mockRequireAuth,
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' }),
}))

vi.mock('@/lib/actions/server-action-write', () => ({
  serverActionWrite: mockServerActionWrite,
}))

vi.mock('@/lib/auth/profile-service', () => ({
  updateUserProfile: mockUpdateUserProfile,
  getUserProfile: mockGetUserProfile,
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
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
    it('should call serverActionWrite with authenticated permission and csrfToken', async () => {
      mockServerActionWrite.mockImplementation(async (_permission: string, _csrfToken: string, writeFn: (_user: unknown) => Promise<unknown>) => {
        return writeFn({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' })
      })
      mockUpdateUserProfile.mockResolvedValue({ data: { id: 'user-1', name: 'New Name', email: 'user@test.com', role: 'USER', createdAt: null, lastLoginAt: null } })

      const fd = createFormData({ name: 'New Name', email: 'user@test.com', csrfToken: 'valid-token' })
      const result = await updateProfile(fd) as any

      expect(mockServerActionWrite).toHaveBeenCalledWith(
        'authenticated', 'valid-token', expect.any(Function), expect.any(Object),
      )
      expect(result.error).toBeUndefined()
      expect(result.data?.name).toBe('New Name')
    })

    it('should return CSRF error when serverActionWrite returns CSRF error', async () => {
      mockServerActionWrite.mockResolvedValue({ error: 'Jeton de sécurité invalide. Veuillez actualiser la page et réessayer.' })

      const fd = createFormData({ name: 'Test User', email: 'user@test.com', csrfToken: 'bad-token' })
      const result = await updateProfile(fd)

      expect(result.error).toContain('Jeton de sécurité invalide')
    })

    it('should return validation error when serverActionWrite returns validation error', async () => {
      mockServerActionWrite.mockResolvedValue({ error: 'Le nom doit contenir au moins 2 caractères' })

      const fd = createFormData({ name: 'A', email: 'user@test.com', csrfToken: 'valid-token' })
      const result = await updateProfile(fd)

      expect(result.error).toBeDefined()
    })

    it('should require current password when changing email inside writeFn', async () => {
      mockServerActionWrite.mockImplementation(async (_permission: string, _csrfToken: string, writeFn: (_user: unknown) => Promise<unknown>) => {
        return writeFn({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' })
      })
      mockUpdateUserProfile.mockResolvedValue({ error: "Votre mot de passe actuel est requis pour changer l'adresse email." })

      const fd = new FormData()
      fd.set('name', 'Test User')
      fd.set('email', 'newemail@test.com')
      fd.set('csrfToken', 'valid-token')

      const result = await updateProfile(fd)

      expect(result.error).toContain('mot de passe actuel')
    })

    it('should reject wrong current password when changing email inside writeFn', async () => {
      mockServerActionWrite.mockImplementation(async (_permission: string, _csrfToken: string, writeFn: (_user: unknown) => Promise<unknown>) => {
        return writeFn({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' })
      })
      mockUpdateUserProfile.mockResolvedValue({ error: 'Mot de passe actuel incorrect.' })

      const fd = new FormData()
      fd.set('name', 'Test User')
      fd.set('email', 'newemail@test.com')
      fd.set('csrfToken', 'valid-token')
      fd.set('currentPassword', 'wrong-pass')

      const result = await updateProfile(fd)

      expect(result.error).toContain('Mot de passe actuel incorrect')
    })

    it('should reject email already in use by another account inside writeFn', async () => {
      mockServerActionWrite.mockImplementation(async (_permission: string, _csrfToken: string, writeFn: (_user: unknown) => Promise<unknown>) => {
        return writeFn({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' })
      })
      mockUpdateUserProfile.mockResolvedValue({ error: 'Cette adresse email est déjà utilisée par un autre compte.' })

      const fd = new FormData()
      fd.set('name', 'Test User')
      fd.set('email', 'taken@test.com')
      fd.set('csrfToken', 'valid-token')
      fd.set('currentPassword', 'correct-pass')

      const result = await updateProfile(fd)

      expect(result.error).toContain('déjà utilisée')
    })

    it('should update profile successfully', async () => {
      mockServerActionWrite.mockImplementation(async (_permission: string, _csrfToken: string, writeFn: (_user: unknown) => Promise<unknown>) => {
        return writeFn({ id: 'user-1', email: 'user@test.com', name: 'Test User', role: 'USER' })
      })
      mockUpdateUserProfile.mockResolvedValue({ data: { id: 'user-1', name: 'New Name', email: 'user@test.com', role: 'USER', createdAt: null, lastLoginAt: null } })

      const fd = new FormData()
      fd.set('name', 'New Name')
      fd.set('email', 'user@test.com')
      fd.set('csrfToken', 'valid-token')

      const result = await updateProfile(fd) as any

      expect(result.error).toBeUndefined()
      expect(result.data?.name).toBe('New Name')
      expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-1', 'New Name', 'user@test.com', undefined)
    })
  })

  describe('getUserProfile', () => {
    it('should return null when user not found in DB', async () => {
      mockGetUserProfile.mockResolvedValue({ error: 'Utilisateur introuvable.' })

      const result = await getUserProfile()

      expect(result).toBeNull()
    })

    it('should return user profile', async () => {
      mockGetUserProfile.mockResolvedValue({
        data: {
          id: 'user-1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'USER',
          createdAt: new Date(),
          lastLoginAt: null,
        },
      })

      const result = await getUserProfile()

      expect(result).not.toBeNull()
      expect(result?.email).toBe('user@test.com')
    })
  })
})
