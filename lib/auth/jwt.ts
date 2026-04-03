import { SignJWT, jwtVerify } from 'jose'
import { createLogger } from '@/lib/logger'

const log = createLogger('jwt')

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return new TextEncoder().encode(secret)
}

function getJwtExpiration(): string {
  return process.env.JWT_EXPIRES_IN || '24h'
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  sessionId: string
  iat?: number
  exp?: number
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  const secret = getJwtSecret()
  const expiration = getJwtExpiration()
  log.debug({ userId: payload.userId, email: payload.email }, 'Generating JWT token')

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)
    log.debug({ userId: payload.userId }, 'JWT token verified successfully')
    return payload as unknown as JWTPayload
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.warn({ error: errorMessage }, 'JWT token verification failed')
    return null
  }
}
