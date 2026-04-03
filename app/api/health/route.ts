import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { redis } from '@/lib/db/redis'
import { verifyToken } from '@/lib/auth/jwt'
import { checkRedisHealth } from '@/lib/db/redis-cluster'
import { createLogger } from '@/lib/logger'

const log = createLogger('health-api')
const COOKIE_NAME = 'auth_token'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  let isAuthenticated = false
  let isAdmin = false

  if (token) {
    try {
      const payload = await verifyToken(token)
      if (payload && (payload.role === 'ADMIN' || payload.role === 'MANAGER')) {
        isAuthenticated = true
        isAdmin = payload.role === 'ADMIN'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      log.debug({ error: errorMessage }, 'Token verification failed in health check')
    }
  }

  const basicHealth = {
    status: 'ok' as 'ok' | 'error',
    timestamp: new Date().toISOString()
  }

  const checks = {
    database: false,
    redis: false,
    schema: false,
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true

    const redisHealth = await checkRedisHealth()
    checks.redis = redisHealth.connected

    const roleCheck = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM pg_enum
      WHERE enumtypid = '"Role"'::regtype
    `
    checks.schema = Number(roleCheck[0].count) === 4

    if (isAuthenticated) {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      const dbLatency = Date.now() - dbStart

      const redisStart = Date.now()
      await redis.ping()
      const redisLatency = Date.now() - redisStart

      const allHealthy = Object.values(checks).every(Boolean)

      return NextResponse.json({
        ...basicHealth,
        status: allHealthy ? 'ok' : 'degraded',
        checks,
        services: {
          database: checks.database ? 'connected' : 'disconnected',
          redis: checks.redis ? 'connected' : 'disconnected',
          app: 'running'
        },
        latency: {
          database: dbLatency,
          redis: redisLatency
        },
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
        isAdmin
      })
    }

    const allHealthy = Object.values(checks).every(Boolean)
    return NextResponse.json({
      ...basicHealth,
      status: allHealthy ? 'ok' : 'degraded',
      checks
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error({ error: errorMessage, checks }, 'Health check failed')
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        checks,
        error: errorMessage
      },
      { status: 503 }
    )
  }
}
