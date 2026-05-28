import type { CacheAdapter } from './cache'
import { RedisCacheAdapter } from './redis-adapter'
import { MemoryCacheAdapter } from './memory-adapter'

let _adapter: CacheAdapter | null = null

export function getAdapter(): CacheAdapter {
  if (!_adapter) {
    _adapter = process.env.CACHE_DRIVER === 'memory'
      ? new MemoryCacheAdapter()
      : new RedisCacheAdapter()
  }
  return _adapter
}
