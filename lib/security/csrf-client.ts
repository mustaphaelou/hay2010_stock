'use server'

import { generateCsrfToken } from '@/lib/security/csrf-server'
import { setCsrfCookie } from '@/lib/security/csrf-server'

export async function getCsrfToken(): Promise<string | null> {
  try {
    const { token, cookieValue } = await generateCsrfToken()
    await setCsrfCookie(cookieValue)
    return token
  } catch (error) {
    console.error('Failed to generate CSRF token:', error)
    return null
  }
}
