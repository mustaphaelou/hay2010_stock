'use server'

import { cookies, headers } from 'next/headers'
import { after } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { generateToken, verifyToken, revokeToken } from '@/lib/auth/jwt'
import { createSession, deleteSession } from '@/lib/auth/session'
import { loginSchema } from '@/lib/auth/validation'
import { recordFailedAttempt, clearFailedAttempts, isAccountLocked, isLockedByIp, recordFailedAttemptByIp, clearFailedAttemptsByIp } from '@/lib/auth/lockout'
import { executeWrite } from '@/lib/actions/execute-write'
import { createLogger } from '@/lib/logger'
import { AUTH_COOKIE_NAME } from '@/lib/constants/auth'
import * as Sentry from '@sentry/nextjs'

const log = createLogger('auth-actions')

export async function login(
  email: string,
  password: string,
  rememberMe: boolean = false,
  csrfToken?: string
): Promise<{ error?: string; success?: boolean }> {
  if (!csrfToken) {
    return { error: 'Jeton de sécurité requis. Veuillez rafraîchir la page.' }
  }

  return executeWrite({
    csrfToken,
    validation: { schema: loginSchema, input: { email, password } },
    writeFn: async () => {
      try {
        const headersList = await headers()
        const clientIp = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
          || headersList.get('x-real-ip')
          || 'unknown'

        const [ipLocked, locked] = await Promise.all([
          isLockedByIp(clientIp),
          isAccountLocked(email),
        ])

        if (ipLocked) {
          return { error: 'Trop de tentatives depuis cet emplacement. Veuillez réessayer dans 15 minutes.' }
        }

        if (locked) {
          return { error: 'Compte temporairement verrouillé suite à trop de tentatives. Veuillez réessayer dans 15 minutes.' }
        }

        const user = await prisma.user.findUnique({
          where: { email }
        })

        if (!user) {
          await Promise.all([
            recordFailedAttempt(email),
            recordFailedAttemptByIp(clientIp),
          ])
          return { error: 'Email ou mot de passe invalide' }
        }

        const isValid = await verifyPassword(password, user.password)

        if (!isValid) {
          const result = await recordFailedAttempt(email)
          await recordFailedAttemptByIp(clientIp)
          if (result.locked) {
            return { error: 'Compte verrouillé suite à trop de tentatives. Veuillez réessayer dans 15 minutes.' }
          }
          return { error: `Email ou mot de passe invalide. ${result.remaining} tentative${result.remaining !== 1 ? 's' : ''} restante${result.remaining !== 1 ? 's' : ''}.` }
        }

        await Promise.all([
          clearFailedAttempts(email),
          clearFailedAttemptsByIp(clientIp),
        ])

        const [sessionId, ] = await Promise.all([
          createSession(user.id, user.email, user.name, user.role),
          prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() } as import('@/lib/generated/prisma/client').Prisma.UserUpdateInput
          }),
        ])

        const token = await generateToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          sessionId
        })

        const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7

        const cookieStore = await cookies()
        cookieStore.set(AUTH_COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge,
          path: '/'
        })

        return { success: true }
      } catch (error) {
        log.error({ email, error }, 'Login error')
        after(() => {
          Sentry.captureException(error, { tags: { action: 'login' } })
        })
        return { error: 'Une erreur inattendue est survenue lors de la connexion' }
      }
    }
  })
}

export async function logout(csrfToken?: string): Promise<{ error?: string; success?: boolean }> {
  if (!csrfToken) {
    return { error: 'Jeton de sécurité requis. Veuillez rafraîchir la page.' }
  }

  return executeWrite({
    permission: 'authenticated',
    csrfToken,
    writeFn: async () => {
      try {
        const cookieStore = await cookies()
        const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value

        if (authToken) {
          const payload = await verifyToken(authToken)
          if (payload?.sessionId) {
            after(async () => {
              await deleteSession(payload.sessionId!)
            })
          }
          if (payload?.jti) {
            after(async () => {
              await revokeToken(payload.jti!)
            })
          }
        }

        cookieStore.delete(AUTH_COOKIE_NAME)
        return { success: true }
      } catch (error) {
        log.error({ error }, 'Logout error')
        after(() => {
          Sentry.captureException(error, { tags: { action: 'logout' } })
        })
        return { error: 'Échec de la déconnexion' }
      }
    }
  })
}

export async function getCurrentUser(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const { getCurrentUser: getCachedUser } = await import('@/lib/auth/user-utils')
  return getCachedUser()
}
