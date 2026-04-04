'use server'

import { generateCsrfToken } from '@/lib/security/csrf-server'
import { setCsrfCookie } from '@/lib/security/csrf-server'
import { createLogger } from '@/lib/logger'

const log = createLogger('csrf-client')

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
