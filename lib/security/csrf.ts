import {
  generateCsrfToken,
  validateCsrfToken,
  requireCsrfToken,
  setCsrfCookie,
  getCsrfCookie,
  getCsrfTokenFromHeader,
  CSRF_COOKIE_NAME,
  CSRF_TOKEN_EXPIRY,
  CsrfTokens
} from '@/lib/security/csrf-server'

export {
  generateCsrfToken,
  validateCsrfToken,
  requireCsrfToken,
  setCsrfCookie,
  getCsrfCookie,
  getCsrfTokenFromHeader,
  CSRF_COOKIE_NAME,
  CSRF_TOKEN_EXPIRY
}

export type { CsrfTokens }

export function getCsrfTokenFromRequest(request: Request): string | null {
  const headerToken = request.headers.get('X-CSRF-Token')
  if (headerToken) return headerToken
  return null
}

console.warn('DEPRECATED: Import from @/lib/security/csrf-server instead of @/lib/security/csrf')
