'use server'

import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/password'
import { registerSchema } from '@/lib/validation'
import crypto from 'crypto'
import { createLogger } from '@/lib/logger'

const log = createLogger('password-reset-actions')

const TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hour in milliseconds

interface PasswordResetToken {
  token: string
  email: string
  expires: number
}

// In-memory store for password reset tokens (use Redis in production)
const resetTokens = new Map<string, PasswordResetToken>()

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of resetTokens.entries()) {
    if (value.expires < now) {
      resetTokens.delete(key)
    }
  }
}, 60 * 60 * 1000) // Clean every hour

export async function requestPasswordReset(email: string): Promise<{ error?: string; success?: boolean; message?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    
    // Always return same message to prevent email enumeration
    const successMessage = 'If this email is registered, you will receive a password reset link shortly.'
    
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: true, message: successMessage }
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      // Still return success to prevent email enumeration
      return { success: true, message: successMessage }
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    
    // Store token with expiry
    resetTokens.set(hashedToken, {
      token: hashedToken,
      email: normalizedEmail,
      expires: Date.now() + TOKEN_EXPIRY
    })

	log.info({ email: normalizedEmail }, 'Password reset token generated (development mode)')

		// TODO: Send email with reset link
    // await sendPasswordResetEmail(normalizedEmail, resetToken)

    return { success: true, message: successMessage }
	} catch (error) {
		log.error({ error, email }, 'Password reset request error')
		return { error: 'An unexpected error occurred' }
  }
}

export async function validateResetToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
  try {
    if (!token) {
      return { valid: false, error: 'Invalid reset token' }
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const storedToken = resetTokens.get(hashedToken)

    if (!storedToken) {
      return { valid: false, error: 'Invalid or expired reset token' }
    }

    if (storedToken.expires < Date.now()) {
      resetTokens.delete(hashedToken)
      return { valid: false, error: 'Reset token has expired' }
    }

    return { valid: true, email: storedToken.email }
	} catch (error) {
		log.error({ error }, 'Token validation error')
		return { valid: false, error: 'An unexpected error occurred' }
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ error?: string; success?: boolean; message?: string }> {
  try {
    // Validate token first
    const tokenValidation = await validateResetToken(token)
    if (!tokenValidation.valid || !tokenValidation.email) {
      return { error: tokenValidation.error || 'Invalid reset token' }
    }

    // Validate password strength
    const passwordValidation = registerSchema.shape.password.safeParse(newPassword)
    if (!passwordValidation.success) {
      return { error: passwordValidation.error.issues.map(e => e.message).join(', ') }
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const storedToken = resetTokens.get(hashedToken)

    if (!storedToken) {
      return { error: 'Invalid or expired reset token' }
    }

    // Hash new password and update user
    const hashedPassword = await hashPassword(newPassword)
    
    await prisma.user.update({
      where: { email: storedToken.email },
      data: { password: hashedPassword }
    })

    // Delete used token
    resetTokens.delete(hashedToken)

  return { success: true, message: 'Your password has been reset successfully. You can now log in with your new password.' }
	} catch (error) {
		log.error({ error }, 'Password reset error')
		return { error: 'An unexpected error occurred' }
  }
}
