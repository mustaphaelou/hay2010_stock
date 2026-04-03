import { describe, it, expect } from 'vitest'
import { createLogger } from '@/lib/logger'

describe('Logger', () => {
  it('should create a logger with context', () => {
    const logger = createLogger('test-context')
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  it('should have child logger methods', () => {
    const logger = createLogger('test')
    const child = logger.child({ subContext: 'child' })
    expect(child).toBeDefined()
    expect(typeof child.info).toBe('function')
  })
})
