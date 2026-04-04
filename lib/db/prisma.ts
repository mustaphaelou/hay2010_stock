import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { createLogger } from '@/lib/logger'

const log = createLogger('prisma')

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  try {
    const pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

	pool.on('error', (err) => {
		log.error({ error: err }, 'PostgreSQL pool error')
	})

    const adapter = new PrismaPg(pool)
const client = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development'
    ? [
      { emit: 'stdout', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ]
    : [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
    ],
  transactionOptions: {
    maxWait: 5000,
    timeout: 10000,
  },
})

	if (process.env.NODE_ENV === 'production') {
		client.$on('query', (e) => {
			if (e.duration > 1000) {
				log.warn({ duration: e.duration, query: e.query.substring(0, 200) }, 'Slow query detected')
			}
		})
	}

    return client
	} catch (error) {
		log.error({ error }, 'Failed to create Prisma client')
		throw error
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function withTransaction<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn)
}
