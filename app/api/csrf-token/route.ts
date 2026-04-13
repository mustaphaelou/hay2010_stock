import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth/jwt'
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/security/csrf-server'
import { createLogger } from '@/lib/logger'
import { AUTH_COOKIE_NAME } from '@/lib/constants/auth'

const log = createLogger('csrf-token-route')

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

		if (!token) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			)
		}

		const payload = await verifyToken(token)
		if (!payload) {
			return NextResponse.json(
				{ error: 'Invalid token' },
				{ status: 401 }
			)
		}

		const { token: csrfToken, cookieValue } = await generateCsrfToken(payload.userId)

		const response = NextResponse.json({ token: csrfToken })
		response.cookies.set(CSRF_COOKIE_NAME, cookieValue, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 3600,
			path: '/',
		})

		return response
	} catch (error) {
		log.error({ error }, 'CSRF token generation error')
		return NextResponse.json(
			{ error: 'Failed to generate CSRF token' },
			{ status: 500 }
		)
	}
}
