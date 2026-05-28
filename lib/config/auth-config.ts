import { getRequiredSecret, getOptionalSecret } from '@/lib/config/env-validation'

export interface AuthConfig {
  jwt: {
    secret: Uint8Array
    expiresIn: string
  }
  session: {
    ttl: number
  }
  lockout: {
    maxAttempts: number
    ipMaxAttempts: number
    duration: number
    failClosed: boolean
  }
  password: {
    saltRounds: number
  }
  passwordReset: {
    tokenTtl: number
  }
  csrf: {
    secret: string
    tokenExpiry: number
  }
  rateLimit: {
    read: { requests: number; window: number }
    write: { requests: number; window: number }
    circuitBreaker: { threshold: number; resetTime: number }
    failClosed: boolean
  }
  cookies: {
    secure: boolean
  }
}

let cached: AuthConfig | null = null

export function getAuthConfig(): AuthConfig {
  if (cached) return cached

  const jwtSecret = getRequiredSecret('JWT_SECRET', 'JWT_SECRET_FILE')
  const csrfSecret = getOptionalSecret('CSRF_SECRET', 'CSRF_SECRET_FILE') || jwtSecret

  cached = {
    jwt: {
      secret: new TextEncoder().encode(jwtSecret),
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    session: { ttl: 900 },
    lockout: {
      maxAttempts: 5,
      ipMaxAttempts: 20,
      duration: 900,
      failClosed: process.env.LOCKOUT_FAIL_CLOSED === 'true',
    },
    password: { saltRounds: 12 },
    passwordReset: { tokenTtl: 3600 },
    csrf: {
      secret: csrfSecret,
      tokenExpiry: 3600,
    },
    rateLimit: {
      read: { requests: 120, window: 60 },
      write: { requests: 30, window: 60 },
      circuitBreaker: { threshold: 5, resetTime: 60000 },
      failClosed: process.env.RATE_LIMIT_FAIL_CLOSED === 'true',
    },
    cookies: { secure: process.env.NODE_ENV === 'production' },
  }

  return cached
}

export function resetAuthConfig(): void {
  cached = null
}
