'use server'

import { cookies, headers } from 'next/headers'
import { executeWrite } from '@/lib/actions/execute-write'
import { loginUser, logoutUser } from '@/lib/auth/auth-service'
import { loginSchema } from '@/lib/auth/validation'
import { AUTH_COOKIE_NAME } from '@/lib/constants/auth'
import { getCurrentUser } from '@/lib/auth/user-utils'

export async function login(e: string, p: string, r = false, t?: string): Promise<{ error?: string; success?: boolean }> {
  return executeWrite({
    csrfToken: t, validation: { schema: loginSchema, input: { email: e, password: p } },
    writeFn: async () => {
      const h = await headers()
      const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
      const d = await loginUser(e, p, r, ip)
      if (d.error) return { error: d.error }
      const c = await cookies()
      c.set(AUTH_COOKIE_NAME, d.data!.token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: r ? 2592000 : 604800, path: '/',
      })
      return { success: true }
    },
  })
}

export async function logout(t?: string): Promise<{ error?: string; success?: boolean }> {
  return executeWrite<{ error?: string; success?: boolean }>({
    permission: 'authenticated', csrfToken: t,
    writeFn: async () => {
      const c = await cookies()
      const v = c.get(AUTH_COOKIE_NAME)?.value
      if (v) await logoutUser(v)
      c.delete(AUTH_COOKIE_NAME)
      return { success: true }
    },
  })
}

export { getCurrentUser }
