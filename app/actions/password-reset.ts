'use server'

import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/password'
import { registerSchema } from '@/lib/validation'
import crypto from 'crypto'
import { createLogger } from '@/lib/logger'
import { storeResetToken, consumeResetToken, validateResetToken } from '@/lib/auth/password-reset'

const log = createLogger('password-reset-actions')

export async function requestPasswordReset(email: string): Promise<{ error?: string; success?: boolean; message?: string }> {
    try {
        const normalizedEmail = email.toLowerCase().trim()

        const successMessage = 'If this email is registered, you will receive a password reset link shortly.'

        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            return { success: true, message: successMessage }
        }

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        })

        if (!user) {
            return { success: true, message: successMessage }
        }

        const resetToken = crypto.randomBytes(32).toString('hex')

        await storeResetToken(resetToken, normalizedEmail)

        log.info({ email: normalizedEmail }, 'Password reset token generated')

        return { success: true, message: successMessage }
    } catch (error) {
        log.error({ error, email }, 'Password reset request error')
        return { error: 'An unexpected error occurred' }
    }
}

export async function validateResetTokenAction(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    return validateResetToken(token)
}

export async function resetPassword(token: string, newPassword: string): Promise<{ error?: string; success?: boolean; message?: string }> {
    try {
    const tokenValidation = await consumeResetToken(token)
    if (!tokenValidation.valid || !tokenValidation.email) {
      return { error: tokenValidation.error || 'Invalid reset token' }
    }

    const passwordValidation = registerSchema.shape.password.safeParse(newPassword)
    if (!passwordValidation.success) {
      return { error: passwordValidation.error.issues.map(e => e.message).join(', ') }
    }

    const hashedPassword = await hashPassword(newPassword)

  await prisma.user.update({
    where: { email: tokenValidation.email },
    data: { password: hashedPassword, passwordChangedAt: new Date() } as any
  })

    return { success: true, message: 'Your password has been reset successfully. You can now log in with your new password.' }
    } catch (error) {
        log.error({ error }, 'Password reset error')
        return { error: 'An unexpected error occurred' }
    }
}
