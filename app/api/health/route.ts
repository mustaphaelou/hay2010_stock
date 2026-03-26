import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { redis } from '@/lib/db/redis'

export async function GET() {
  const health = {
    status: 'healthy' as 'healthy' | 'unhealthy' | 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected' as string,
      redis: 'connected' as string,
      app: 'running'
    },
    latency: {
      database: 0,
      redis: 0
    }
  }

  // Check database connection
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    health.latency.database = Date.now() - dbStart
  } catch (error) {
    console.error('Database health check failed:', error)
    health.services.database = 'disconnected'
    health.status = 'unhealthy'
  }

  // Check Redis connection
  try {
    const redisStart = Date.now()
    await redis.ping()
    health.latency.redis = Date.now() - redisStart
  } catch (error) {
    console.error('Redis health check failed:', error)
    health.services.redis = 'disconnected'
    // Redis failure is degraded, not unhealthy - app can run without Redis
    if (health.status === 'healthy') {
      health.status = 'degraded'
    }
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503
  return NextResponse.json(health, { status: statusCode })
}
