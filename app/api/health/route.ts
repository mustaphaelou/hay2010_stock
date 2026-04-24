import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'

import { verifyToken } from '@/lib/auth/jwt'
import { checkRedisHealth } from '@/lib/db/redis'
import { createLogger } from '@/lib/logger'
import { AUTH_COOKIE_NAME } from '@/lib/constants/auth'

const log = createLogger('health-admin-api')

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value

  // Require authentication for admin health check
  if (!token) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        code: 'AUTHENTICATION_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    )
  }

  let payload
  try {
    payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        {
          error: 'Invalid or expired token',
          code: 'AUTHENTICATION_ERROR',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.debug({ error: errorMessage }, 'Token verification failed in admin health check')
    return NextResponse.json(
      {
        error: 'Token verification failed',
        code: 'AUTHENTICATION_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    )
  }

  // Check if user has ADMIN or MANAGER role
  const isAdmin = payload.role === 'ADMIN'
  const isManager = payload.role === 'MANAGER'
  
  if (!isAdmin && !isManager) {
    return NextResponse.json(
      {
        error: 'Insufficient permissions. ADMIN or MANAGER role required.',
        code: 'AUTHORIZATION_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 403 }
    )
  }

  const basicHealth = {
    status: 'ok' as 'ok' | 'error',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    user: {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      isAdmin
    }
  }

  const checks = {
    database: false,
    redis: false,
    schema: false,
  }

  const detailedChecks = {
    database: {
      connected: false,
      latency: 0,
      error: null as string | null
    },
    redis: {
      connected: false,
      latency: 0,
      error: null as string | null
    },
    schema: {
      valid: false,
      error: null as string | null
    }
  }

  try {
    // Database connectivity and latency check
    const dbStart = Date.now()
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.database = true
      detailedChecks.database.connected = true
      detailedChecks.database.latency = Date.now() - dbStart
    } catch (dbError) {
      detailedChecks.database.error = dbError instanceof Error ? dbError.message : 'Database connection failed'
      log.error({ error: detailedChecks.database.error }, 'Database health check failed')
    }

    // Redis connectivity and latency check
    const redisStart = Date.now()
    try {
      const redisHealth = await checkRedisHealth()
      checks.redis = redisHealth.connected
      detailedChecks.redis.connected = redisHealth.connected
      detailedChecks.redis.latency = Date.now() - redisStart
      if (!redisHealth.connected) {
        detailedChecks.redis.error = 'Redis connection failed'
      }
    } catch (redisError) {
      detailedChecks.redis.error = redisError instanceof Error ? redisError.message : 'Redis connection failed'
      log.error({ error: detailedChecks.redis.error }, 'Redis health check failed')
    }

    // Database schema validation
    try {
      const roleCheck = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM pg_enum
        WHERE enumtypid = '"Role"'::regtype
      `
      checks.schema = Number(roleCheck[0].count) === 4
      detailedChecks.schema.valid = checks.schema
      if (!checks.schema) {
        detailedChecks.schema.error = `Expected 4 Role enum values, found ${roleCheck[0].count}`
      }
    } catch (schemaError) {
      detailedChecks.schema.error = schemaError instanceof Error ? schemaError.message : 'Schema validation failed'
      log.error({ error: detailedChecks.schema.error }, 'Schema health check failed')
    }

    // Additional checks for ADMIN users only
    let systemMetrics = {}
    if (isAdmin) {
      try {
        // Get database size
        const dbSizeResult = await prisma.$queryRaw<Array<{ size: string }>>`
          SELECT pg_database_size(current_database()) as size
        `
        const dbSizeBytes = Number(dbSizeResult[0].size)
        
        // Get table counts
        const userCount = await prisma.user.count()
        const stockCount = await prisma.niveauStock.count()
        const movementCount = await prisma.mouvementStock.count()
        
        systemMetrics = {
          databaseSize: `${(dbSizeBytes / 1024 / 1024).toFixed(2)} MB`,
          counts: {
            users: userCount,
            stockItems: stockCount,
            stockMovements: movementCount
          }
        }
      } catch (metricsError) {
        log.warn({ error: metricsError }, 'Failed to collect system metrics')
      }
    }

    const allHealthy = Object.values(checks).every(Boolean)

    return NextResponse.json({
      ...basicHealth,
      status: allHealthy ? 'ok' : 'degraded',
      checks: detailedChecks,
      summary: {
        database: checks.database ? 'connected' : 'disconnected',
        redis: checks.redis ? 'connected' : 'disconnected',
        schema: checks.schema ? 'valid' : 'invalid',
        app: 'running'
      },
      latency: {
        database: detailedChecks.database.latency,
        redis: detailedChecks.redis.latency
      },
      ...(isAdmin && { systemMetrics }),
      message: allHealthy 
        ? 'All systems operational' 
        : 'Some services are degraded. Check detailed checks for more information.'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error({ error: errorMessage, checks }, 'Admin health check failed')
    return NextResponse.json(
      {
        ...basicHealth,
        status: 'error',
        checks: detailedChecks,
        error: errorMessage,
        message: 'Health check failed unexpectedly'
      },
      { status: 503 }
    )
  }
}
