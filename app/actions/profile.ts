'use server'

import { prisma } from '@/lib/db/prisma'
import { after } from 'next/server'
import { requireAuth } from '@/lib/auth/user-utils'
import { validateCsrfToken, getCsrfCookie } from '@/lib/security/csrf-server'
import { verifyPassword } from '@/lib/auth/password'
import { createLogger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'

const log = createLogger('profile-actions')

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(255),
  email: z.string().email('Adresse email invalide'),
  currentPassword: z.string().optional(),
})

export async function updateProfile(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    const user = await requireAuth()

    const csrfToken = formData.get('csrfToken') as string
    if (!csrfToken) {
      log.warn({ userId: user.id }, 'CSRF token missing on profile update')
      return { error: 'Jeton de sécurité requis. Veuillez actualiser la page.' }
    }

    const csrfCookie = await getCsrfCookie()
    const valid = await validateCsrfToken(user.id, csrfToken, csrfCookie || '')
    if (!valid) {
      log.warn({ userId: user.id }, 'Invalid CSRF token on profile update')
      return { error: 'Jeton de sécurité invalide. Veuillez actualiser la page et réessayer.' }
    }

    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const currentPassword = formData.get('currentPassword') as string | null

    const validationResult = updateProfileSchema.safeParse({ name, email, currentPassword })
    if (!validationResult.success) {
      return { error: validationResult.error.issues.map((e) => e.message).join(', ') }
    }

    // If email is changing, require current password
    if (validationResult.data.email !== user.email) {
      if (!currentPassword) {
        return { error: 'Votre mot de passe actuel est requis pour changer l\'adresse email.' }
      }
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true, email: true },
      })
      if (!dbUser) {
        return { error: 'Utilisateur introuvable.' }
      }
      const passwordValid = await verifyPassword(currentPassword, dbUser.password)
      if (!passwordValid) {
        return { error: 'Mot de passe actuel incorrect.' }
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: validationResult.data.email },
    })
    if (existingUser && existingUser.id !== user.id) {
      return { error: 'Cette adresse email est déjà utilisée par un autre compte.' }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: validationResult.data.name,
        email: validationResult.data.email,
      },
    })

    log.info({ userId: user.id }, 'Profile updated successfully')
    return { success: true }
  } catch (error) {
    log.error({ error }, 'Profile update error')
    after(() => {
      Sentry.captureException(error, { tags: { action: 'updateProfile' } })
    })
    return { error: 'Une erreur inattendue est survenue lors de la mise à jour du profil.' }
  }
}

export async function getUserProfile(): Promise<{
  id: string
  email: string
  name: string
  role: string
  createdAt: Date | null
  lastLoginAt: Date | null
} | null> {
  try {
    const user = await requireAuth()

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      } as any,
    })

    if (!dbUser) return null

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as string,
      createdAt: dbUser.createdAt as Date | null,
      lastLoginAt: dbUser.lastLoginAt as Date | null,
    }
  } catch (error) {
    log.error({ error }, 'Get user profile error')
    return null
  }
}
