import { prisma } from '@/lib/db/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { generateToken, verifyToken, revokeToken } from '@/lib/auth/jwt'
import { createSession, deleteSession } from '@/lib/auth/session'
import {
  recordFailedAttempt,
  clearFailedAttempts,
  isAccountLocked,
  isLockedByIp,
  recordFailedAttemptByIp,
  clearFailedAttemptsByIp,
} from '@/lib/auth/lockout'
import { createLogger } from '@/lib/logger'

const log = createLogger('auth-service')

interface LoginResult {
  user: { id: string; email: string; name: string; role: string }
  sessionId: string
  token: string
}

export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean,
  clientIp: string
): Promise<{ data?: LoginResult; error?: string }> {
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

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    await Promise.all([recordFailedAttempt(email), recordFailedAttemptByIp(clientIp)])
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

  await Promise.all([clearFailedAttempts(email), clearFailedAttemptsByIp(clientIp)])

  const [sessionId] = await Promise.all([
    createSession(user.id, user.email, user.name, user.role),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ])

  const token = await generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  })

  log.debug({ email }, 'User logged in successfully')

  return {
    data: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      sessionId,
      token,
    },
  }
}

export async function logoutUser(
  tokenValue: string
): Promise<{ data?: void; error?: string }> {
  const payload = await verifyToken(tokenValue)
  if (payload?.sessionId) {
    await deleteSession(payload.sessionId)
  }
  if (payload?.jti) {
    await revokeToken(payload.jti)
  }
  return { data: undefined }
}
