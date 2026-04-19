'use server'

import { generateCsrfToken, ANONYMOUS_USER_ID } from '@/lib/security/csrf-server'
import { setCsrfCookie } from '@/lib/security/csrf-server'
import { createLogger } from '@/lib/logger'

const log = createLogger('csrf-client')

/**
 * Generate a CSRF token for the current user (server action version).
 *
 * For unauthenticated users (login page), generates a token under
 * the 'anonymous' key prefix, which matches the validation call
 * in login() that uses 'anonymous'.
 *
 * For authenticated users, uses their actual user ID.
 *
 * The token AND cookie value are generated and stored atomically.
 */
export async function getCsrfToken(): Promise<string | null> {
  try {
    const { token, cookieValue } = await generateCsrfToken()
    await setCsrfCookie(cookieValue)
    return token
  } catch (error) {
    log.error({ error }, 'Failed to generate CSRF token')
    return null
  }
}

/**
 * Generate a CSRF token for an anonymous/unauthenticated user.
 * Explicitly uses 'anonymous' as the userId to ensure consistency
 * with the validation in login() and logout().
 */
export async function getAnonymousCsrfToken(): Promise<string | null> {
  try {
    const { token, cookieValue } = await generateCsrfToken(ANONYMOUS_USER_ID)
    await setCsrfCookie(cookieValue)
    return token
  } catch (error) {
    log.error({ error }, 'Failed to generate anonymous CSRF token')
    return null
  }
}
