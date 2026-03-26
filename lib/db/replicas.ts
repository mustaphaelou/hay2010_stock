/**
 * Database Read Replica Support
 * 
 * This module provides read/write splitting for PostgreSQL replicas.
 * Write operations go to the primary, read operations are load-balanced across replicas.
 */

import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Configuration types
interface DatabaseConfig {
    primary: string
    replicas: string[]
    maxConnections: number
    idleTimeout: number
    connectionTimeout: number
}

// Default configuration from environment
const config: DatabaseConfig = {
    primary: process.env.DATABASE_PRIMARY_URL || process.env.DATABASE_URL || '',
    replicas: [
        process.env.DATABASE_REPLICA_1_URL || '',
        process.env.DATABASE_REPLICA_2_URL || '',
    ].filter(Boolean),
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
}

// Configuration validation flag
let configValidated = false

/**
 * Validate database configuration
 * Call this before using the database clients
 */
export function validateDatabaseConfig(): void {
    if (configValidated) return

    if (!config.primary) {
        throw new Error('DATABASE_URL or DATABASE_PRIMARY_URL environment variable is required')
    }

    configValidated = true
}

// Global type declarations for hot-reload prevention
const globalForPrisma = global as unknown as {
    writeClient: PrismaClient | undefined
    readClients: PrismaClient[] | undefined
}

/**
 * Create a Prisma client with connection pool
 */
function createPrismaClient(connectionString: string, poolSize: number): PrismaClient {
    const pool = new Pool({
        connectionString,
        max: poolSize,
        idleTimeoutMillis: config.idleTimeout,
        connectionTimeoutMillis: config.connectionTimeout,
    })

    pool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err)
    })

    const adapter = new PrismaPg(pool)

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    })
}

/**
 * Primary database client for write operations
 * Lazy initialization - only creates client when first accessed
 */
let _writeClient: PrismaClient | undefined

export function getWriteClient(): PrismaClient {
    if (!_writeClient) {
        validateDatabaseConfig()
        _writeClient = globalForPrisma.writeClient ?? createPrismaClient(config.primary, config.maxConnections)
    }
    return _writeClient
}

// Legacy export for backward compatibility - lazy initialization
export const writeClient = new Proxy({} as PrismaClient, {
    get(_target, prop) {
        const client = getWriteClient()
        if (typeof prop === 'string') {
            return (client as unknown as Record<string, unknown>)[prop]
        }
        return undefined
    }
})

/**
 * Read replica clients for read operations
 * Falls back to primary if no replicas are configured
 */
let _readClients: PrismaClient[] | undefined

export function getReadClients(): PrismaClient[] {
    if (!_readClients) {
        validateDatabaseConfig()
        _readClients = globalForPrisma.readClients ?? (
            config.replicas.length > 0
                ? config.replicas.map(url => createPrismaClient(url, Math.ceil(config.maxConnections / config.replicas.length)))
                : [getWriteClient()] // Fallback to primary if no replicas
        )
    }
    return _readClients
}

// Legacy export for backward compatibility - lazy initialization
export const readClients: PrismaClient[] = new Proxy([] as PrismaClient[], {
    get(_target, prop) {
        const clients = getReadClients()
        if (typeof prop === 'string') {
            return (clients as unknown as Record<string, unknown>)[prop]
        }
        return undefined
    }
})

// Prevent multiple instances in development - store actual clients
if (process.env.NODE_ENV !== 'production') {
    // Note: These will be set when clients are first accessed via getters
}

/**
 * Round-robin load balancer for read replicas
 */
let readIndex = 0

export function getReadClient(): PrismaClient {
    const clients = getReadClients()
    const client = clients[readIndex]
    readIndex = (readIndex + 1) % clients.length
    return client
}

/**
 * Health check for all database connections
 */
export async function checkDatabaseHealth(): Promise<{
    primary: boolean
    replicas: boolean[]
    latency: { primary: number; replicas: number[] }
}> {
    const results = {
        primary: false,
        replicas: [] as boolean[],
        latency: { primary: 0, replicas: [] as number[] },
    }

    // Check primary
    try {
        const start = Date.now()
        const client = getWriteClient()
        await client.$queryRaw`SELECT 1`
        results.primary = true
        results.latency.primary = Date.now() - start
    } catch (error) {
        console.error('Primary database health check failed:', error)
    }

    // Check replicas
    const clients = getReadClients()
    for (let i = 0; i < clients.length; i++) {
        try {
            const start = Date.now()
            await clients[i].$queryRaw`SELECT 1`
            results.replicas.push(true)
            results.latency.replicas.push(Date.now() - start)
        } catch (error) {
            console.error(`Replica ${i + 1} health check failed:`, error)
            results.replicas.push(false)
            results.latency.replicas.push(-1)
        }
    }

    return results
}

/**
 * Transaction helper that uses primary for all operations
 */
export async function withTransaction<T>(
    fn: (client: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>) => Promise<T>
): Promise<T> {
    const client = getWriteClient()
    return client.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>) => {
        return fn(tx)
    })
}

/**
 * Read-only transaction helper that can use replicas
 */
export async function withReadTransaction<T>(
    fn: (client: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>) => Promise<T>
): Promise<T> {
    const client = getReadClient()
    return client.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>) => {
        return fn(tx)
    }, { isolationLevel: 'RepeatableRead' })
}

// Export default client for backward compatibility
// This uses read replicas for better performance
export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop) {
        // Write operations should go to primary
        const writeOperations = ['$connect', '$disconnect', '$executeRaw', '$executeRawUnsafe', '$transaction']

        if (typeof prop === 'string' && writeOperations.includes(prop)) {
            const client = getWriteClient()
            return (client as unknown as Record<string, unknown>)[prop]
        }

        // For model operations, we need to determine if it's a read or write
        // This is a simplified approach - in production, you'd want more sophisticated routing
        const client = getReadClient()
        if (typeof prop === 'symbol') {
            return undefined
        }
        return (client as unknown as Record<string, unknown>)[prop]
    }
})

export default prisma
