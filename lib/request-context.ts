import { AsyncLocalStorage } from 'async_hooks'

export interface RequestContext {
  requestId: string
  userId?: string
  sessionId?: string
  ip?: string
  userAgent?: string
}

const requestContext = new AsyncLocalStorage<RequestContext>()

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore()
}

export function setRequestContext<T>(context: RequestContext, fn: () => T): T {
  return requestContext.run(context, fn)
}

export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
