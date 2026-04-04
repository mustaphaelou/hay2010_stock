'use server'

import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/password'
import { registerSchema } from '@/lib/validation'
import { createLogger } from '@/lib/logger'

const log = createLogger('registration-actions')

export async function publicRegister(
  email: string,
  password: string,
  name: string
): Promise<{ error?: string; success?: boolean; message?: string }> {
  try {
    // Validate input
    const validationResult = registerSchema.safeParse({ email, password, name })
    if (!validationResult.success) {
      return { error: 'Invalid input: ' + validationResult.error.issues.map((e: { message: string }) => e.message).join(', ') }
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return { error: 'An account with this email already exists. Please try logging in instead.' }
    }

    // Create user with default role
    const hashedPassword = await hashPassword(password)

    await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
        role: 'USER'
      }
    })

    return { success: true, message: 'Account created successfully! You can now log in.' }
	} catch (error) {
		log.error({ error, email }, 'Registration error')
		return { error: 'An unexpected error occurred during registration' }
  }
}
