import crypto from 'crypto'
import { redisSession } from '@/lib/db/redis'
import { createLogger } from '@/lib/logger'

const log = createLogger('password-reset')

const TOKEN_PREFIX = 'pwdreset:'
const TOKEN_TTL = 60 * 60 // 1 hour in seconds

export interface PasswordResetTokenData {
    email: string
    createdAt: number
}

function getTokenKey(hashedToken: string): string {
    return `${TOKEN_PREFIX}${hashedToken}`
}

export async function storeResetToken(token: string, email: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const key = getTokenKey(hashedToken)
    const data: PasswordResetTokenData = {
        email,
        createdAt: Date.now()
    }

    try {
        await redisSession.setex(key, TOKEN_TTL, JSON.stringify(data))
        log.info({ email }, 'Password reset token stored in Redis')
    } catch (error) {
        log.error({ error, email }, 'Failed to store password reset token')
        throw new Error('Failed to store reset token')
    }
}

export async function getResetToken(token: string): Promise<PasswordResetTokenData | null> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const key = getTokenKey(hashedToken)

    try {
        const data = await redisSession.get(key)
        if (!data) {
            return null
        }
        return JSON.parse(data) as PasswordResetTokenData
    } catch (error) {
        log.error({ error }, 'Failed to get password reset token')
        return null
    }
}

export async function deleteResetToken(token: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    const key = getTokenKey(hashedToken)

    try {
        await redisSession.del(key)
    } catch (error) {
        log.error({ error }, 'Failed to delete password reset token')
    }
}

export async function validateResetToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    if (!token) {
        return { valid: false, error: 'Invalid reset token' }
    }

    const tokenData = await getResetToken(token)

    if (!tokenData) {
        return { valid: false, error: 'Invalid or expired reset token' }
    }

    return { valid: true, email: tokenData.email }
}

export { TOKEN_TTL }
