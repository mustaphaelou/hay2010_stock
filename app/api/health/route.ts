import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requirePermission } from '@/lib/auth/authorization'
import { checkRedisHealth } from '@/lib/db/redis'
import { createLogger } from '@/lib/logger'

const log = createLogger('health-admin-api')

export async function GET() {
  try {
    const user = await requirePermission('reports:view')

    const isAdmin = user.role === 'ADMIN'

    const basicHealth = {
      status: 'ok' as 'ok' | 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
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
        const dbSizeResult = await prisma.$queryRaw<Array<{ size: string }>>`
          SELECT pg_database_size(current_database()) as size
        `
        const dbSizeBytes = Number(dbSizeResult[0].size)

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
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      const status = error.message === 'Forbidden' ? 403 : 401
      const code = error.message === 'Forbidden' ? 'AUTHORIZATION_ERROR' : 'AUTHENTICATION_ERROR'
      return NextResponse.json(
        {
          error: error.message === 'Forbidden' ? 'Insufficient permissions' : 'Authentication required',
          code,
          timestamp: new Date().toISOString()
        },
        { status }
      )
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error({ error: errorMessage }, 'Admin health check failed')
    return NextResponse.json(
      {
        status: 'error',
        error: errorMessage,
        message: 'Health check failed unexpectedly'
      },
      { status: 503 }
    )
  }
}
