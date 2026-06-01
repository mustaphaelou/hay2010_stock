import { createLogger } from '@/lib/logger'

const log = createLogger('invalidation-registry')

export type InvalidationHandler = (inv: { kind: string }) => Promise<void>

export class InvalidationRegistry {
  private handlers = new Map<string, InvalidationHandler>()

  register(kind: string, handler: InvalidationHandler): void {
    if (this.handlers.has(kind)) {
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(
          `InvalidationRegistry: handler for kind '${kind}' already registered`
        )
      }
      log.warn(
        { kind },
        'InvalidationRegistry: duplicate registration, overwriting'
      )
    }
    this.handlers.set(kind, handler)
  }

  async run(invalidations: CacheInvalidation[]): Promise<void> {
    for (const inv of invalidations) {
      const handler = this.handlers.get(inv.kind)
      if (handler) {
        await handler(inv)
      }
    }
  }
}

export const registry = new InvalidationRegistry()
