import { prisma } from '@/lib/db/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { createLogger } from '@/lib/logger'

const log = createLogger('profile-service')

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  createdAt: Date | null
  lastLoginAt: Date | null
}

export async function getUserProfile(
  userId: string
): Promise<{ data?: UserProfile; error?: string }> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  })

  if (!dbUser) {
    return { error: 'Utilisateur introuvable.' }
  }

  return {
    data: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as string,
      createdAt: dbUser.createdAt as Date | null,
      lastLoginAt: dbUser.lastLoginAt as Date | null,
    },
  }
}

export async function updateUserProfile(
  userId: string,
  name: string,
  email: string,
  currentPassword?: string
): Promise<{ data?: UserProfile; error?: string }> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true, email: true },
  })

  if (!dbUser) {
    return { error: 'Utilisateur introuvable.' }
  }

  if (email !== dbUser.email) {
    if (!currentPassword) {
      return { error: "Votre mot de passe actuel est requis pour changer l'adresse email." }
    }
    const passwordValid = await verifyPassword(currentPassword, dbUser.password)
    if (!passwordValid) {
      return { error: 'Mot de passe actuel incorrect.' }
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser && existingUser.id !== userId) {
    return { error: 'Cette adresse email est déjà utilisée par un autre compte.' }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name, email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  })

  log.info({ userId }, 'Profile updated successfully')

  return {
    data: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role as string,
      createdAt: updated.createdAt as Date | null,
      lastLoginAt: updated.lastLoginAt as Date | null,
    },
  }
}
