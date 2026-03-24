import Redis from 'ioredis'

const globalForRedis = global as unknown as { redis: Redis }

export const redis =
globalForRedis.redis ||
new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  lazyConnect: true,
})

redis.on('error', (err) => {
  console.warn('[ioredis] Connection error (Redis may not be running):', err.message)
})

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
