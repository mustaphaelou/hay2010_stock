'use server'

import { requirePermission } from '@/lib/auth/authorization'
import { prisma } from '@/lib/db/prisma'
import { randomBytes, createHash } from 'crypto'
import { Role } from '@/lib/generated/prisma/client'
import { after } from 'next/server'
import { executeWrite } from '@/lib/actions/execute-write'
import { createLogger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

const log = createLogger('api-keys')

function generateKey() {
  const rawKey = randomBytes(32).toString('hex')
  const prefix = rawKey.substring(0, 8)
  const hash = createHash('sha256').update(rawKey).digest('hex')
  return { rawKey, prefix, hash }
}

export async function createApiKey(name: string, csrfToken: string) {
  return executeWrite({
    permission: 'users:write',
    csrfToken,
    writeFn: async (user) => {
      try {
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
      } catch (error) {
        log.error({ error }, 'API key creation error')
        after(() => {
          Sentry.captureException(error, { tags: { action: 'createApiKey' } })
        })
        return { error: 'Une erreur inattendue est survenue lors de la création de la clé API.' }
      }
    }
  })
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

export async function revokeApiKey(id: string, csrfToken: string) {
  return executeWrite({
    permission: 'users:write',
    csrfToken,
    writeFn: async (user) => {
      try {
        await prisma.apiKey.update({
          where: { id },
          data: { isActive: false }
        })

        log.info({ userId: user.id }, 'API key revoked')
        return { success: true }
      } catch (error) {
        log.error({ error }, 'API key revocation error')
        after(() => {
          Sentry.captureException(error, { tags: { action: 'revokeApiKey' } })
        })
        return { error: 'Une erreur inattendue est survenue lors de la révocation de la clé API.' }
      }
    }
  })
}
