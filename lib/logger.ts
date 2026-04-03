import pino from 'pino'

const logLevel = process.env.LOG_LEVEL || 'info'
const isDevelopment = process.env.NODE_ENV === 'development'

const redactedFields = [
  'password',
  'token',
  'authorization',
  'cookie',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  '*.password',
  '*.token',
  '*.secret',
]

const logger = pino({
  level: logLevel,
  redact: {
    paths: redactedFields,
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  serializers: {
    error: pino.stdSerializers.err,
    request: (req: { method?: string; url?: string; headers?: Record<string, string> }) => ({
      method: req.method,
      url: req.url,
      headers: req.headers,
    }),
    response: (res: { statusCode?: number }) => ({
      statusCode: res.statusCode,
    }),
  },
})

export const createLogger = (context: string) => {
  return logger.child({ context })
}

export type Logger = ReturnType<typeof createLogger>

export default logger
