'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { prisma } from '@/lib/db/prisma'
import { randomBytes, createHash } from 'crypto'
import { Role } from '@/lib/generated/prisma/client'

function generateKey() {
  const rawKey = randomBytes(32).toString('hex')
  const prefix = rawKey.substring(0, 8)
  const hash = createHash('sha256').update(rawKey).digest('hex')
  return { rawKey, prefix, hash }
}

export async function createApiKey(name: string) {
  const user = await requirePermission('users:write')

  const { rawKey, prefix, hash } = generateKey()

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: user.id,
      name,
      keyPrefix: prefix,
      keyHash: hash,
      role: user.role as Role,
    }
  })

  return { id: apiKey.id, name: apiKey.name, keyPrefix: apiKey.keyPrefix, rawKey }
}

export async function listApiKeys() {
  await requirePermission('users:read')

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        }
      }
    }
  })

  return keys
}

export async function revokeApiKey(id: string) {
  await requirePermission('users:write')

  await prisma.apiKey.update({
    where: { id },
    data: { isActive: false }
  })

  return { success: true }
}
