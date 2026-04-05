import {
    generateCsrfToken,
    validateCsrfToken,
    requireCsrfToken,
    validateCsrfTokenFromAction,
    setCsrfCookie,
    getCsrfCookie,
    CsrfTokens,
    CSRF_COOKIE_NAME,
    CSRF_TOKEN_EXPIRY
} from '@/lib/security/csrf-server'

export {
    generateCsrfToken,
    validateCsrfToken,
    requireCsrfToken,
    validateCsrfTokenFromAction,
    setCsrfCookie,
    getCsrfCookie,
    CSRF_COOKIE_NAME,
    CSRF_TOKEN_EXPIRY
}

export type { CsrfTokens }

export function getCsrfTokenFromRequest(request: Request): string | null {
    const headerToken = request.headers.get('X-CSRF-Token')
    if (headerToken) return headerToken
    return null
}

console.warn('DEPRECATED: Import from @/lib/security/csrf-server instead of @/lib/auth/csrf-server')
