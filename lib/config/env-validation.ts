type SecretSource = {
  envVar: string
  fileVar?: string
  required: boolean
  minLength?: number
  description: string
}

const REQUIRED_SECRETS: SecretSource[] = [
  {
    envVar: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
  },
  {
    envVar: 'REDIS_URL',
    required: true,
    description: 'Redis connection string',
  },
  {
    envVar: 'JWT_SECRET',
    fileVar: 'JWT_SECRET_FILE',
    required: true,
    minLength: 32,
    description: 'JWT signing secret (min 32 characters)',
  },
]

const OPTIONAL_SECRETS: SecretSource[] = [
  {
    envVar: 'POSTGRES_PASSWORD',
    fileVar: 'POSTGRES_PASSWORD_FILE',
    required: false,
    description: 'PostgreSQL password (used to construct DATABASE_URL)',
  },
  {
    envVar: 'REDIS_PASSWORD',
    fileVar: 'REDIS_PASSWORD_FILE',
    required: false,
    description: 'Redis password (used to construct REDIS_URL)',
  },
  {
    envVar: 'CSRF_SECRET',
    fileVar: 'CSRF_SECRET_FILE',
    required: false,
    minLength: 32,
    description: 'CSRF HMAC secret (falls back to JWT_SECRET if not set)',
  },
]

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  secrets: Record<string, boolean>
}

export function getSecret(envVar: string, _fileVar?: string): string | undefined {
  return process.env[envVar]
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const secrets: Record<string, boolean> = {}

  const allSecrets = [...REQUIRED_SECRETS, ...OPTIONAL_SECRETS]

  for (const secret of allSecrets) {
    const value = getSecret(secret.envVar, secret.fileVar)

    if (!value) {
      if (secret.required) {
        errors.push(`Missing required secret: ${secret.envVar} (${secret.description})`)
        secrets[secret.envVar] = false
      } else {
        warnings.push(`Optional secret not set: ${secret.envVar}`)
        secrets[secret.envVar] = false
      }
      continue
    }

    if (secret.minLength && value.length < secret.minLength) {
      errors.push(
        `${secret.envVar} is too short (min ${secret.minLength} characters, got ${value.length})`
      )
      secrets[secret.envVar] = false
      continue
    }

    secrets[secret.envVar] = true
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    secrets,
  }
}

export function assertEnvironment(): void {
  const result = validateEnvironment()

  if (!result.valid) {
    console.error('\n========================================')
    console.error('ENVIRONMENT VALIDATION FAILED')
    console.error('========================================\n')

    for (const error of result.errors) {
      console.error(`  ❌ ${error}`)
    }

    if (result.warnings.length > 0) {
      console.error('\nWarnings:')
      for (const warning of result.warnings) {
        console.error(`  ⚠️  ${warning}`)
      }
    }

    console.error('\nPlease check:')
    console.error('  1. Docker Secrets are mounted correctly')
    console.error('  2. Environment variables are set')
    console.error('  3. Secret files exist and are readable')
    console.error('\nTo generate secrets:')
    console.error('  cd secrets && ./generate-secrets.sh')
    console.error('\n========================================\n')

    throw new Error('Environment validation failed')
  }

  console.log('\n========================================')
  console.log('ENVIRONMENT VALIDATION PASSED')
  console.log('========================================\n')

  for (const [secret, ok] of Object.entries(result.secrets)) {
    if (ok) {
      console.log(`  ✓ ${secret}`)
    }
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:')
    for (const warning of result.warnings) {
      console.log(`  ⚠️  ${warning}`)
    }
  }

  console.log('\n========================================\n')
}

export function getRequiredSecret(envVar: string, fileVar?: string): string {
  const value = getSecret(envVar, fileVar)
  if (!value) {
    throw new Error(`Required secret ${envVar} not found. Provide via ${envVar} or ${fileVar || `${envVar}_FILE`}`)
  }
  return value
}

export function getOptionalSecret(envVar: string, _fileVar?: string, defaultValue = ''): string {
  return getSecret(envVar, _fileVar) || defaultValue
}
