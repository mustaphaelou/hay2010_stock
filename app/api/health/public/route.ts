import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { checkRedisHealth } from '@/lib/db/redis'
import { createLogger } from '@/lib/logger'

const log = createLogger('health-public-api')

export const dynamic = 'force-dynamic'

/**
 * Add security headers to public health check response
 */
function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
}

/**
 * Public health check endpoint (no authentication required)
 * Used by Docker health checks, load balancers, and monitoring systems.
 * Returns basic status only - detailed checks require authentication.
 * 
 * @route GET /api/health/public
 * @returns {object} 200 - Basic health status
 * @returns {object} 503 - Service unavailable
 */
export async function GET() {
  const basicHealth = {
    status: 'ok' as 'ok' | 'error',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }

  const checks = {
    database: false,
    redis: false,
    app: true, // App is running if we're executing this code
  }

  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`
    checks.database = true

    // Redis check
    const redisHealth = await checkRedisHealth()
    checks.redis = redisHealth.connected

    const allHealthy = Object.values(checks).every(Boolean)

    const response = NextResponse.json({
      ...basicHealth,
      status: allHealthy ? 'ok' : 'degraded',
      checks,
      message: allHealthy ? 'All systems operational' : 'Some services are degraded'
    })
    
    addSecurityHeaders(response)
    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error({ error: errorMessage, checks }, 'Public health check failed')

    const response = NextResponse.json(
      {
        ...basicHealth,
        status: 'error',
        checks,
        error: errorMessage,
        message: 'Service unavailable'
      },
      { status: 503 }
    )
    
    addSecurityHeaders(response)
    return response
  }
}