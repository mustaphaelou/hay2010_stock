/**
 * Centralized Error Handling System
 * 
 * Provides consistent error classes and handling across the application.
 * All errors extend AppError for consistent structure and logging.
 */

import { createLogger } from './logger'

const log = createLogger('errors')

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>
  public readonly timestamp: Date

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date()

    // Capture stack trace (excluding constructor call)
    Error.captureStackTrace(this, this.constructor)
  }

  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError('BAD_REQUEST', message, 400, details)
  }

  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError('UNAUTHORIZED', message, 401)
  }

  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError('FORBIDDEN', message, 403)
  }

  static notFound(message: string = 'Not found'): AppError {
    return new AppError('NOT_FOUND', message, 404)
  }

  static conflict(message: string, details?: Record<string, unknown>): AppError {
    return new AppError('CONFLICT', message, 409, details)
  }

  static rateLimited(retryAfter?: number): AppError {
    return new AppError('RATE_LIMITED', 'Too many requests', 429, { retryAfter })
  }

  static csrf(): AppError {
    return new AppError('CSRF_ERROR', 'Invalid security token', 403)
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString()
    }
  }

  /**
   * Log the error with appropriate level
   */
  log() {
    const logData = {
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack
    }

    if (this.statusCode >= 500) {
      log.error(logData, this.message)
    } else if (this.statusCode >= 400) {
      log.warn(logData, this.message)
    } else {
      log.info(logData, this.message)
    }
  }
}

/**
 * Validation errors (400)
 * Used for invalid input data
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    details?: Record<string, unknown>
  ) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Authentication errors (401)
 * Used for invalid or missing credentials
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication required',
    details?: Record<string, unknown>
  ) {
    super('AUTHENTICATION_ERROR', message, 401, details)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization errors (403)
 * Used for insufficient permissions
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Insufficient permissions',
    details?: Record<string, unknown>
  ) {
    super('AUTHORIZATION_ERROR', message, 403, details)
    this.name = 'AuthorizationError'
  }
}

/**
 * Not found errors (404)
 * Used for missing resources
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    details?: Record<string, unknown>
  ) {
    super('NOT_FOUND', `${resource} not found`, 404, details)
    this.name = 'NotFoundError'
  }
}

/**
 * Conflict errors (409)
 * Used for duplicate resources or business rule violations
 */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Conflict occurred',
    details?: Record<string, unknown>
  ) {
    super('CONFLICT', message, 409, details)
    this.name = 'ConflictError'
  }
}

/**
 * Rate limit errors (429)
 * Used when rate limits are exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    const enhancedDetails = {
      ...details,
      ...(retryAfter && { retryAfter })
    }
    super('RATE_LIMIT_EXCEEDED', message, 429, enhancedDetails)
    this.name = 'RateLimitError'
  }
}

/**
 * Database errors (500)
 * Used for database operation failures
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    details?: Record<string, unknown>
  ) {
    super('DATABASE_ERROR', message, 500, details)
    this.name = 'DatabaseError'
  }
}

/**
 * External service errors (502)
 * Used for failures in external dependencies
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string = 'External service error',
    details?: Record<string, unknown>
  ) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 502, details)
    this.name = 'ExternalServiceError'
  }
}

/**
 * Business logic errors (422)
 * Used for business rule violations
 */
export class BusinessError extends AppError {
  constructor(
    message: string = 'Business rule violation',
    details?: Record<string, unknown>
  ) {
    super('BUSINESS_ERROR', message, 422, details)
    this.name = 'BusinessError'
  }
}

/**
 * Error handler for API routes
 * Catches and formats errors in a consistent way
 */
export async function handleApiError(
  error: unknown,
  context?: Record<string, unknown>
): Promise<Response> {
  let appError: AppError

  // Convert unknown error to AppError
  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof Error) {
    // Convert generic Error to AppError
    appError = new AppError(
      'INTERNAL_ERROR',
      error.message,
      500,
      { originalError: error.name, ...context }
    )
  } else {
    // Convert unknown error type
    appError = new AppError(
      'UNKNOWN_ERROR',
      'An unknown error occurred',
      500,
      { originalError: String(error), ...context }
    )
  }

  // Log the error
  appError.log()

  // Return formatted response
  return new Response(
    JSON.stringify(appError.toJSON()),
    {
      status: appError.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Code': appError.code
      }
    }
  )
}

/**
 * Error handler for Next.js API routes
 * Returns NextResponse instead of Response
 */
import { NextResponse } from 'next/server'

export async function handleNextApiError(
  error: unknown,
  context?: Record<string, unknown>
): Promise<NextResponse> {
  let appError: AppError

  // Convert unknown error to AppError
  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof Error) {
    // Convert generic Error to AppError
    appError = new AppError(
      'INTERNAL_ERROR',
      error.message,
      500,
      { originalError: error.name, ...context }
    )
  } else {
    // Convert unknown error type
    appError = new AppError(
      'UNKNOWN_ERROR',
      'An unknown error occurred',
      500,
      { originalError: String(error), ...context }
    )
  }

  // Log the error
  appError.log()

  // Return formatted response
  return NextResponse.json(
    appError.toJSON(),
    {
      status: appError.statusCode,
      headers: {
        'X-Error-Code': appError.code
      }
    }
  )
}

/**
 * Error boundary for React components
 */
export class ErrorBoundaryError extends AppError {
  constructor(
    message: string = 'Component error',
    details?: Record<string, unknown>
  ) {
    super('COMPONENT_ERROR', message, 500, details)
    this.name = 'ErrorBoundaryError'
  }
}

/**
 * Utility to create validation errors from Zod validation results
 */
import { ZodError } from 'zod'

export function createValidationErrorFromZod(zodError: ZodError): ValidationError {
  const issues = 'issues' in zodError ? zodError.issues : (zodError as unknown as { errors?: Array<{ path: (string | number)[]; message: string; code: string }> }).errors || []
  const details = issues.reduce<Record<string, { message: string; code: string }>>((acc, error) => {
    const path = error.path?.join('.') || 'unknown'
    return {
      ...acc,
      [path]: {
        message: error.message,
        code: error.code
      }
    }
  }, {})

  return new ValidationError('Validation failed', details)
}

/**
 * Utility to check if error is a database unique constraint violation
 */
export function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Unique constraint') ||
           error.message.includes('duplicate key') ||
           error.message.includes('23505') // PostgreSQL unique violation code
  }
  return false
}

/**
 * Utility to check if error is a database foreign key violation
 */
export function isForeignKeyError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Foreign key constraint') ||
           error.message.includes('23503') // PostgreSQL foreign key violation code
  }
  return false
}

/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

/**
 * Safe error code extraction
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof AppError) {
    return error.code
  }
  return 'UNKNOWN_ERROR'
}

/**
 * Error recovery strategies
 */
export interface RecoveryStrategy {
  shouldRetry: (error: AppError, attempt: number) => boolean
  getDelay: (attempt: number) => number
  maxAttempts: number
}

export const defaultRecoveryStrategy: RecoveryStrategy = {
  shouldRetry: (error: AppError) => {
    // Retry on network errors, timeouts, and rate limits
    return error.statusCode === 429 || 
           error.code === 'EXTERNAL_SERVICE_ERROR' ||
           error.code === 'DATABASE_ERROR'
  },
  getDelay: (attempt: number) => {
    // Exponential backoff with jitter
    const baseDelay = Math.pow(2, attempt) * 100
    const jitter = Math.random() * 100
    return baseDelay + jitter
  },
  maxAttempts: 3
}

/**
 * Execute operation with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  strategy: RecoveryStrategy = defaultRecoveryStrategy
): Promise<T> {
  let lastError: AppError
  let attempt = 0

  while (attempt < strategy.maxAttempts) {
    try {
      return await operation()
    } catch (error) {
      attempt++
      lastError = error instanceof AppError ? error : new AppError(
        'RETRY_ERROR',
        getErrorMessage(error),
        500
      )

      if (!strategy.shouldRetry(lastError, attempt) || attempt >= strategy.maxAttempts) {
        throw lastError
      }

      const delay = strategy.getDelay(attempt)
      log.info({ attempt, delay, error: lastError.code }, `Retrying operation after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}