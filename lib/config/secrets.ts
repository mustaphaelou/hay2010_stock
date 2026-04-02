import { readFileSync, existsSync } from 'fs';

/**
 * Get secret value from Docker Secrets (_FILE suffixed env var) or direct env var
 * Docker Secrets take precedence when available
 * 
 * @param envVar - The environment variable name (e.g., 'JWT_SECRET')
 * @param fileVar - Optional custom file variable name (defaults to ${envVar}_FILE)
 * @returns The secret value
 * @throws Error if secret is not found in either location
 */
export function getSecret(envVar: string, fileVar?: string): string {
  const fileEnv = fileVar || `${envVar}_FILE`;
  const filePath = process.env[fileEnv];

  if (filePath && existsSync(filePath)) {
    try {
      return readFileSync(filePath, 'utf-8').trim();
    } catch (error) {
      throw new Error(`Failed to read secret from ${filePath}: ${error}`);
    }
  }

  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Secret ${envVar} not found. Provide via ${envVar} or ${fileEnv}`);
  }
  return value;
}

/**
 * Get secret value with fallback to default value
 * Useful for optional secrets
 * 
 * @param envVar - The environment variable name
 * @param defaultValue - Default value if not found
 * @param fileVar - Optional custom file variable name
 * @returns The secret value or default
 */
export function getSecretOrDefault(envVar: string, defaultValue: string, fileVar?: string): string {
  try {
    return getSecret(envVar, fileVar);
  } catch {
    return defaultValue;
  }
}

/**
 * Check if a secret is available (either via Docker Secret or env var)
 * 
 * @param envVar - The environment variable name
 * @param fileVar - Optional custom file variable name
 * @returns true if secret is available
 */
export function hasSecret(envVar: string, fileVar?: string): boolean {
  const fileEnv = fileVar || `${envVar}_FILE`;
  const filePath = process.env[fileEnv];

  if (filePath && existsSync(filePath)) {
    return true;
  }

  return !!process.env[envVar];
}
