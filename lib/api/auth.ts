import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { createLogger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError } from '@/lib/errors'
import type { Role } from '@/lib/generated/prisma/client'

const log = createLogger('api-auth')

const KEY_PREFIX = 'hay2010_sk_live_'
const KEY_PREFIX_LENGTH = KEY_PREFIX.length
const KEY_RANDOM_BYTES = 16
const KEY_TOTAL_LENGTH = KEY_PREFIX_LENGTH + KEY_RANDOM_BYTES * 2

function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

function extractKeyPrefix(rawKey: string): string | null {
  if (rawKey.length !== KEY_TOTAL_LENGTH) return null
  if (!rawKey.startsWith(KEY_PREFIX)) return null
  return rawKey.substring(0, 12)
}

function generateRawKey(): string {
  const randomHex = randomBytes(KEY_RANDOM_BYTES).toString('hex')
  return `${KEY_PREFIX}${randomHex}`
}

export interface ApiKeyResult {
  userId: string
  role: Role
  keyId: string
}

export interface GeneratedApiKey {
  rawKey: string
  id: string
  name: string
  keyPrefix: string
}

export async function generateApiKey(
  userId: string,
  name: string,
  role: Role
): Promise<GeneratedApiKey> {
  const rawKey = generateRawKey()
  const keyPrefix = extractKeyPrefix(rawKey)!
  const keyHash = hashApiKey(rawKey)

  const record = await prisma.apiKey.create({
    data: { userId, name, keyPrefix, keyHash, role },
  })

  log.info({ userId, keyId: record.id, name }, 'API key generated')

  return { rawKey, id: record.id, name, keyPrefix }
}

export async function verifyApiKey(rawKey: string): Promise<ApiKeyResult | null> {
  const prefix = extractKeyPrefix(rawKey)
  if (!prefix) return null

  const keyHash = hashApiKey(rawKey)

  try {
    const record = await prisma.apiKey.findFirst({
      where: { keyHash, isActive: true },
    })

    if (!record) return null

    if (record.expiresAt && record.expiresAt < new Date()) {
      log.warn({ keyId: record.id }, 'Expired API key used')
      return null
    }

    await prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })

    return { userId: record.userId, role: record.role as Role, keyId: record.id }
  } catch (error) {
    log.error({ error }, 'API key verification failed')
    return null
  }
}

export async function getApiUser(request: Request): Promise<ApiKeyResult | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const rawKey = authHeader.slice(7).trim()
  if (!rawKey) return null

  return verifyApiKey(rawKey)
}

export async function requireApiKey(request: Request): Promise<ApiKeyResult> {
  const result = await getApiUser(request)
  if (!result) {
    throw new AuthenticationError('Invalid or missing API key')
  }
  return result
}

export async function requireApiRole(
  request: Request,
  allowedRoles: Role[]
): Promise<ApiKeyResult> {
  const result = await requireApiKey(request)
  if (!allowedRoles.includes(result.role)) {
    throw new AuthorizationError(`Insufficient permissions. Required: ${allowedRoles.join(', ')}`)
  }
  return result
}
