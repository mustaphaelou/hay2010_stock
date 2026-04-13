import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hashes a plain text password using bcrypt.
 * Uses 12 salt rounds for optimal security/performance balance.
 * 
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password string
 * @example
 * const hashedPassword = await hashPassword('MySecurePassword123')
 * // Store hashedPassword in database
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verifies a plain text password against a hashed password.
 * Constant-time comparison to prevent timing attacks.
 * 
 * @param password - Plain text password to verify
 * @param hashedPassword - Bcrypt hashed password from database
 * @returns Promise resolving to boolean indicating match
 * @example
 * const isValid = await verifyPassword('password123', storedHash)
 * if (!isValid) {
 *   throw new Error('Invalid credentials')
 * }
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
