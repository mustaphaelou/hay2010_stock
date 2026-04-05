import * as Sentry from '@sentry/nextjs'

export interface ClientLogContext {
    [key: string]: string | number | boolean | null | undefined
}

export interface ClientErrorOptions {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    user?: {
        id?: string
        email?: string
        username?: string
    }
}

function isSentryEnabled(): boolean {
    return typeof process.env.NEXT_PUBLIC_SENTRY_DSN === 'string' && 
           process.env.NEXT_PUBLIC_SENTRY_DSN.length > 0
}

export function captureClientError(error: Error | string, options?: ClientErrorOptions): void {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorObj = typeof error === 'string' ? new Error(error) : error
    
    console.error('[Client Error]', errorMessage, options?.extra || '')
    
    if (isSentryEnabled()) {
        Sentry.withScope((scope) => {
            if (options?.tags) {
                Object.entries(options.tags).forEach(([key, value]) => {
                    scope.setTag(key, value)
                })
            }
            
            if (options?.extra) {
                Object.entries(options.extra).forEach(([key, value]) => {
                    scope.setExtra(key, value)
                })
            }
            
            if (options?.user) {
                scope.setUser(options.user)
            }
            
            Sentry.captureException(errorObj)
        })
    }
}

export function captureClientMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ClientLogContext): void {
    const logLevel = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'
    console[logLevel](`[Client ${level.charAt(0).toUpperCase() + level.slice(1)}]`, message, context || '')
    
    if (isSentryEnabled()) {
        Sentry.withScope((scope) => {
            if (context) {
                scope.setContext('context', context)
            }
            Sentry.captureMessage(message, level)
        })
    }
}

export function setClientUser(user: { id?: string; email?: string; username?: string } | null): void {
    if (isSentryEnabled()) {
        Sentry.setUser(user)
    }
}

export function addClientBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
    if (isSentryEnabled()) {
        Sentry.addBreadcrumb({
            category,
            message,
            level: 'info',
            data
        })
    }
}

export const clientLogger = {
    error: (error: Error | string, options?: ClientErrorOptions) => captureClientError(error, options),
    warn: (message: string, context?: ClientLogContext) => captureClientMessage(message, 'warning', context),
    info: (message: string, context?: ClientLogContext) => captureClientMessage(message, 'info', context),
    setUser: setClientUser,
    addBreadcrumb: addClientBreadcrumb
}

export default clientLogger
