'use server'

import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/password'
import { registerSchema } from '@/lib/validation'
import { createLogger } from '@/lib/logger'
import { redis, isRedisReady } from '@/lib/db/redis'
import { headers } from 'next/headers'

const log = createLogger('registration-actions')

const REG_RATE_LIMIT_PREFIX = 'reg_rate:'
const REG_RATE_LIMIT_MAX = 5
const REG_RATE_LIMIT_WINDOW = 3600

async function getClientIdentifier(): Promise<string> {
  try {
    const headersList = await headers()
    const forwarded = headersList.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    return ip
  } catch {
    return 'unknown'
  }
}

async function checkRegistrationRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `${REG_RATE_LIMIT_PREFIX}${identifier}`
  
  if (!isRedisReady()) {
    log.warn('Redis not ready, skipping rate limit check')
    return { allowed: true, remaining: REG_RATE_LIMIT_MAX }
  }

  try {
    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, REG_RATE_LIMIT_WINDOW)
    }
    
    const remaining = Math.max(0, REG_RATE_LIMIT_MAX - current)
    return { allowed: current <= REG_RATE_LIMIT_MAX, remaining }
  } catch (error) {
    log.error({ error }, 'Rate limit check failed')
    return { allowed: true, remaining: REG_RATE_LIMIT_MAX }
  }
}

export async function publicRegister(
  email: string,
  password: string,
  name: string
): Promise<{ error?: string; success?: boolean; message?: string }> {
  try {
    const clientIdentifier = await getClientIdentifier()
    const rateCheck = await checkRegistrationRateLimit(clientIdentifier)
    
    if (!rateCheck.allowed) {
      return { error: 'Too many registration attempts. Please try again later.' }
    }

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
