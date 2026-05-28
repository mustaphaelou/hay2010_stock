import { SignJWT, jwtVerify } from 'jose'
import { createLogger } from '@/lib/logger'
import { getAuthConfig } from '@/lib/config/auth-config'
import { redis, isRedisReady } from '@/lib/db/redis'
import { randomBytesHex } from '@/lib/utils/crypto'

const log = createLogger('jwt')

const JWT_BLOCKLIST_PREFIX = 'jwt:blocklist:'

function getJwtExpirationSeconds(): number {
  const { expiresIn } = getAuthConfig().jwt
  const match = expiresIn.match(/^(\d+)(h|m|s)?$/)
  if (!match) return 86400
  const value = parseInt(match[1], 10)
  const unit = match[2] || 's'
  switch (unit) {
    case 'h': return value * 3600
    case 'm': return value * 60
    default: return value
  }
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  sessionId: string
  jti?: string
  iat?: number
  exp?: number
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  const { secret, expiresIn } = getAuthConfig().jwt
  const jti = randomBytesHex(16)
  log.debug({ userId: payload.userId, email: payload.email }, 'Generating JWT token')

  return new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { secret } = getAuthConfig().jwt
    const { payload } = await jwtVerify(token, secret)

    if (payload.jti && isRedisReady()) {
      const blocklisted = await redis.exists(`${JWT_BLOCKLIST_PREFIX}${payload.jti}`)
      if (blocklisted) {
        log.warn({ jti: payload.jti }, 'JWT token is blocklisted')
        return null
      }
    }

    log.debug({ userId: payload.userId }, 'JWT token verified successfully')
    return payload as unknown as JWTPayload
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.warn({ error: errorMessage }, 'JWT token verification failed')
    return null
  }
}

export async function revokeToken(jti: string): Promise<void> {
  if (!jti || !isRedisReady()) return

  const ttl = getJwtExpirationSeconds()
  await redis.setex(`${JWT_BLOCKLIST_PREFIX}${jti}`, ttl, '1')
  log.info({ jti }, 'JWT token added to blocklist')
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  if (!jti || !isRedisReady()) return false
  const exists = await redis.exists(`${JWT_BLOCKLIST_PREFIX}${jti}`)
  return exists === 1
}
