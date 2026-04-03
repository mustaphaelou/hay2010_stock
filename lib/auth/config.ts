export const AUTH_CONFIG = {
  lockout: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60,
    failClosed: process.env.LOCKOUT_FAIL_CLOSED === 'true',
  },
  rateLimit: {
    enabled: true,
    failClosed: process.env.RATE_LIMIT_FAIL_CLOSED === 'true',
  },
  session: {
    maxAge: 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false,
  },
}

export function isFailClosedEnabled(): boolean {
  return process.env.LOCKOUT_FAIL_CLOSED === 'true' || process.env.RATE_LIMIT_FAIL_CLOSED === 'true'
}
