import { SignJWT, jwtVerify } from 'jose'

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
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}
