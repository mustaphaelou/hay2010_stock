import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',
    integrations: [
      Sentry.prismaIntegration(),
      Sentry.redisIntegration(),
    ],
    ignoreErrors: [
      'Network error',
      'NetworkError',
      'ECONNREFUSED',
      'ENOTFOUND',
    ],
    beforeSend(event, hint) {
      const error = hint.originalException
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code: string }).code
        if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(errorCode)) {
          return null
        }
      }
      return event
    },
  })
}
