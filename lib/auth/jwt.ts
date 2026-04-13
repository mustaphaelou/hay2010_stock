import { SignJWT, jwtVerify } from 'jose'
import { createLogger } from '@/lib/logger'

const log = createLogger('jwt')

/**
 * Retrieves the JWT secret from environment variables.
 * @throws {Error} If JWT_SECRET is not defined in environment
 * @returns Uint8Array encoded secret for JWT operations
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Retrieves the JWT expiration time from environment.
 * @returns JWT expiration duration (default: 24h)
 */
function getJwtExpiration(): string {
  return process.env.JWT_EXPIRES_IN || '24h'
}

/**
 * JWT payload structure containing user authentication data.
 * @property userId - Unique user identifier (UUID)
 * @property email - User email address
 * @property role - User role (ADMIN, MANAGER, USER, VIEWER)
 * @property sessionId - Unique session identifier
 * @property iat - Issued at timestamp (set by JWT library)
 * @property exp - Expiration timestamp (set by JWT library)
 */
export interface JWTPayload {
  userId: string
  email: string
  role: string
  sessionId: string
  iat?: number
  exp?: number
}

/**
 * Generates a new JWT token for authenticated user.
 * Uses HS256 algorithm with configurable expiration.
 * 
 * @param payload - User authentication data to encode
 * @returns Promise resolving to signed JWT token
 * @example
 * const token = await generateToken({
 *   userId: 'uuid',
 *   email: 'user@example.com',
 *   role: 'USER',
 *   sessionId: 'session-uuid'
 * })
 */
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

/**
 * Verifies and decodes a JWT token.
 * Returns null if verification fails (invalid, expired, or malformed).
 * 
 * @param token - JWT token string to verify
 * @returns Promise resolving to decoded payload or null if invalid
 * @example
 * const payload = await verifyToken(token)
 * if (payload) {
 *   console.log('User:', payload.email)
 * }
 */
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
