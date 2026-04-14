import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  BusinessError,
  handleApiError,
  handleNextApiError,
  createValidationErrorFromZod,
  isUniqueConstraintError,
  isForeignKeyError,
  getErrorMessage,
  getErrorCode,
  defaultRecoveryStrategy,
  executeWithRetry
} from '@/lib/errors'
import { ZodError, z } from 'zod'

describe('Error Handling System', () => {
  describe('AppError', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('TEST_ERROR', 'Test message')
      
      expect(error).toBeInstanceOf(AppError)
      expect(error.message).toBe('Test message')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.details).toBeUndefined()
      expect(error.timestamp).toBeInstanceOf(Date)
      expect(error.name).toBe('AppError')
    })

    it('should create AppError with custom status code and details', () => {
      const details = { field: 'email', reason: 'invalid format' }
      const error = new AppError('VALIDATION_ERROR', 'Validation failed', 400, details)
      
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual(details)
    })

    it('should convert to JSON format', () => {
      const error = new AppError('TEST_ERROR', 'Test message', 400, { foo: 'bar' })
      const json = error.toJSON()
      
      expect(json).toEqual({
        error: 'Test message',
        code: 'TEST_ERROR',
        details: { foo: 'bar' },
        timestamp: error.timestamp.toISOString()
      })
    })
  })

  describe('Specific Error Classes', () => {
    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid input', { field: 'email' })
      
      expect(error).toBeInstanceOf(ValidationError)
      expect(error).toBeInstanceOf(AppError)
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.name).toBe('ValidationError')
    })

    it('should create AuthenticationError', () => {
      const error = new AuthenticationError('Invalid credentials')
      
      expect(error).toBeInstanceOf(AuthenticationError)
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('AUTHENTICATION_ERROR')
    })

    it('should create AuthorizationError', () => {
      const error = new AuthorizationError('Insufficient permissions')
      
      expect(error).toBeInstanceOf(AuthorizationError)
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('AUTHORIZATION_ERROR')
    })

    it('should create NotFoundError', () => {
      const error = new NotFoundError('User', { id: '123' })
      
      expect(error).toBeInstanceOf(NotFoundError)
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toBe('User not found')
    })

    it('should create ConflictError', () => {
      const error = new ConflictError('Duplicate resource')
      
      expect(error).toBeInstanceOf(ConflictError)
      expect(error.statusCode).toBe(409)
      expect(error.code).toBe('CONFLICT')
    })

    it('should create RateLimitError with retryAfter', () => {
      const error = new RateLimitError('Too many requests', 60, { endpoint: '/api/test' })
      
      expect(error).toBeInstanceOf(RateLimitError)
      expect(error.statusCode).toBe(429)
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(error.details).toHaveProperty('retryAfter', 60)
    })

    it('should create DatabaseError', () => {
      const error = new DatabaseError('Connection failed')
      
      expect(error).toBeInstanceOf(DatabaseError)
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('DATABASE_ERROR')
    })

    it('should create ExternalServiceError', () => {
      const error = new ExternalServiceError('PaymentGateway', 'Service unavailable')
      
      expect(error).toBeInstanceOf(ExternalServiceError)
      expect(error.statusCode).toBe(502)
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR')
      expect(error.message).toBe('PaymentGateway: Service unavailable')
    })

    it('should create BusinessError', () => {
      const error = new BusinessError('Insufficient stock')
      
      expect(error).toBeInstanceOf(BusinessError)
      expect(error.statusCode).toBe(422)
      expect(error.code).toBe('BUSINESS_ERROR')
    })
  })

  describe('handleApiError', () => {
    it('should handle AppError instance', async () => {
      const error = new ValidationError('Invalid input')
      const response = await handleApiError(error)
      
      expect(response.status).toBe(400)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('X-Error-Code')).toBe('VALIDATION_ERROR')
      
      const body = await response.json()
      expect(body.code).toBe('VALIDATION_ERROR')
      expect(body.error).toBe('Invalid input')
    })

    it('should handle generic Error', async () => {
      const error = new Error('Generic error')
      const response = await handleApiError(error)
      
      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.code).toBe('INTERNAL_ERROR')
      expect(body.error).toBe('Generic error')
    })

    it('should handle unknown error type', async () => {
      const response = await handleApiError('string error')
      
      expect(response.status).toBe(500)
      
      const body = await response.json()
      expect(body.code).toBe('UNKNOWN_ERROR')
      expect(body.error).toBe('An unknown error occurred')
    })

    it('should include context in details', async () => {
      const error = new Error('Test error')
      const context = { userId: '123', action: 'login' }
      const response = await handleApiError(error, context)
      
      const body = await response.json()
      expect(body.details).toMatchObject(context)
    })
  })

  describe('handleNextApiError', () => {
    it('should return NextResponse with error details', async () => {
      const error = new ValidationError('Invalid input')
      const response = await handleNextApiError(error)
      
      expect(response.status).toBe(400)
      expect(response.headers.get('X-Error-Code')).toBe('VALIDATION_ERROR')
      
      const body = await response.json()
      expect(body.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('createValidationErrorFromZod', () => {
    it('should create ValidationError from ZodError', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18)
      })

      try {
        schema.parse({ email: 'invalid', age: 15 })
      } catch (error) {
        const validationError = createValidationErrorFromZod(error as ZodError)
        
        expect(validationError).toBeInstanceOf(ValidationError)
        expect(validationError.details).toHaveProperty('email')
        expect(validationError.details).toHaveProperty('age')
        expect(validationError.message).toBe('Validation failed')
      }
    })
  })

  describe('Error Detection Utilities', () => {
    it('should detect unique constraint error', () => {
      const error1 = new Error('Unique constraint violation on field email')
      const error2 = new Error('duplicate key value violates unique constraint')
      const error3 = new Error('error code: 23505')
      const error4 = new Error('Some other error')
      
      expect(isUniqueConstraintError(error1)).toBe(true)
      expect(isUniqueConstraintError(error2)).toBe(true)
      expect(isUniqueConstraintError(error3)).toBe(true)
      expect(isUniqueConstraintError(error4)).toBe(false)
    })

    it('should detect foreign key error', () => {
      const error1 = new Error('Foreign key constraint violation')
      const error2 = new Error('error code: 23503')
      const error3 = new Error('Some other error')
      
      expect(isForeignKeyError(error1)).toBe(true)
      expect(isForeignKeyError(error2)).toBe(true)
      expect(isForeignKeyError(error3)).toBe(false)
    })
  })

  describe('Error Message and Code Utilities', () => {
    it('should extract message from AppError', () => {
      const error = new ValidationError('Invalid input')
      expect(getErrorMessage(error)).toBe('Invalid input')
    })

    it('should extract message from Error', () => {
      const error = new Error('Generic error')
      expect(getErrorMessage(error)).toBe('Generic error')
    })

    it('should extract message from string', () => {
      expect(getErrorMessage('string error')).toBe('string error')
    })

    it('should extract message from unknown', () => {
      expect(getErrorMessage(123)).toBe('An unknown error occurred')
    })

    it('should extract code from AppError', () => {
      const error = new ValidationError('Invalid input')
      expect(getErrorCode(error)).toBe('VALIDATION_ERROR')
    })

    it('should extract code from unknown', () => {
      expect(getErrorCode(new Error('test'))).toBe('UNKNOWN_ERROR')
      expect(getErrorCode('test')).toBe('UNKNOWN_ERROR')
    })
  })

  describe('Retry Logic', () => {
    describe('defaultRecoveryStrategy', () => {
      it('should retry on rate limit errors', () => {
        const error = new RateLimitError('Too many requests')
        expect(defaultRecoveryStrategy.shouldRetry(error, 1)).toBe(true)
      })

      it('should retry on external service errors', () => {
        const error = new ExternalServiceError('Service', 'Unavailable')
        expect(defaultRecoveryStrategy.shouldRetry(error, 1)).toBe(true)
      })

      it('should retry on database errors', () => {
        const error = new DatabaseError('Connection failed')
        expect(defaultRecoveryStrategy.shouldRetry(error, 1)).toBe(true)
      })

      it('should not retry on validation errors', () => {
        const error = new ValidationError('Invalid input')
        expect(defaultRecoveryStrategy.shouldRetry(error, 1)).toBe(false)
      })

      it('should calculate exponential backoff with jitter', () => {
        const delay1 = defaultRecoveryStrategy.getDelay(1)
        const delay2 = defaultRecoveryStrategy.getDelay(2)
        const delay3 = defaultRecoveryStrategy.getDelay(3)
        
        expect(delay1).toBeGreaterThanOrEqual(200)
        expect(delay1).toBeLessThanOrEqual(300)
        expect(delay2).toBeGreaterThanOrEqual(400)
        expect(delay2).toBeLessThanOrEqual(500)
        expect(delay3).toBeGreaterThanOrEqual(800)
        expect(delay3).toBeLessThanOrEqual(900)
      })
    })

    describe('executeWithRetry', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

  afterEach(() => {
    vi.useRealTimers()
    // Clear any unhandled rejections
    vi.clearAllMocks()
  })

      it('should succeed on first attempt', async () => {
        const operation = vi.fn().mockResolvedValue('success')
        
        const result = await executeWithRetry(operation)
        
        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(1)
      })

      it('should retry on retryable error and succeed', async () => {
        const operation = vi.fn()
          .mockRejectedValueOnce(new DatabaseError('Connection failed'))
          .mockResolvedValueOnce('success')
        
        const promise = executeWithRetry(operation)
        
        // Advance past first retry delay
        await vi.advanceTimersByTimeAsync(300)
        
        const result = await promise
        
        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(2)
      })

  it('should fail after max attempts', async () => {
    const operation = vi.fn().mockRejectedValueOnce(new DatabaseError('Connection failed'))
      .mockRejectedValueOnce(new DatabaseError('Connection failed'))

    const promise = executeWithRetry(operation, {
      ...defaultRecoveryStrategy,
      maxAttempts: 2
    })

    const expectPromise = expect(promise).rejects.toThrow('Connection failed')

    // Advance past all retry delays
    await vi.advanceTimersByTimeAsync(700) // 300 + 400

    await expectPromise
    expect(operation).toHaveBeenCalledTimes(2)
  })

      it('should not retry non-retryable errors', async () => {
        const operation = vi.fn().mockRejectedValue(new ValidationError('Invalid input'))
        
        await expect(executeWithRetry(operation)).rejects.toThrow('Invalid input')
        expect(operation).toHaveBeenCalledTimes(1)
      })
    })
  })
})