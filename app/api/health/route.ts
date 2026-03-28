import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { redis } from '@/lib/db/redis'
import { verifyToken } from '@/lib/auth/jwt'

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
    } catch {
      // Token invalid, proceed with basic health check
    }
  }

  const basicHealth = {
    status: 'ok' as 'ok' | 'error',
    timestamp: new Date().toISOString()
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    await redis.ping()
    
    if (isAuthenticated) {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      const dbLatency = Date.now() - dbStart
      
      const redisStart = Date.now()
      await redis.ping()
      const redisLatency = Date.now() - redisStart
      
      return NextResponse.json({
        ...basicHealth,
        status: 'ok',
        services: {
          database: 'connected',
          redis: 'connected',
          app: 'running'
        },
        latency: {
          database: dbLatency,
          redis: redisLatency
        },
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV
      })
    }
    
    return NextResponse.json(basicHealth)
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}
