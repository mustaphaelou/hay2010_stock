/**
 * Metrics Middleware
 * 
 * Tracks business metrics for API requests and operations.
 * Integrates with the business metrics system.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMetrics } from '@/lib/monitoring/metrics-registry'
import {
  recordApiBusinessRequest,
  recordBusinessTransactionDuration,
  recordBusinessError,
  recordUserAction,
  recordUserLogin,
  recordUserSessionDuration,
  recordDocumentGeneration
} from './business-metrics'
import { getErrorCode } from '@/lib/errors'
import { verifyToken } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME } from '@/lib/constants/auth'

const { httpRequestsTotal, httpRequestDuration, httpRequestsInFlight } = getMetrics()

/**
 * Middleware to track metrics for API requests
 */
export async function withMetrics(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now()
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method
  
  // Track request in flight
  httpRequestsInFlight?.inc({ method })
  
  try {
    const response = await handler(request)
    const duration = Date.now() - startTime
    
    // Track system metrics
    httpRequestsTotal?.inc({ method, path, status: response.status.toString() })
    httpRequestDuration?.observe({ method, path, status: response.status.toString() }, duration / 1000)
    
    // Track business metrics
    recordApiBusinessRequest({
      endpoint: path,
      method,
      status: response.status.toString()
    })
    
    recordBusinessTransactionDuration({
      transactionType: 'api_request',
      duration: duration / 1000
    })
    
    return response
  } catch (error) {
    const duration = Date.now() - startTime
    const errorCode = getErrorCode(error)
    
    // Track error in system metrics (500 status for errors)
    httpRequestsTotal?.inc({ method, path, status: '500' })
    httpRequestDuration?.observe({ method, path, status: '500' }, duration / 1000)
    
    // Track business error
    recordBusinessError({
      errorType: errorCode,
      operation: `${method} ${path}`,
      severity: 'HIGH' // API errors are typically high severity
    })
    
    recordApiBusinessRequest({
      endpoint: path,
      method,
      status: '500'
    })
    
    throw error
  } finally {
    // Decrement request in flight
    httpRequestsInFlight?.dec({ method })
  }
}

/**
 * Track database query metrics
 */
export function trackDatabaseQuery<T>(
  queryType: string,
  table: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  const { dbQueryDuration } = getMetrics()
  
  return operation()
    .then(result => {
      const duration = Date.now() - startTime
      dbQueryDuration?.observe({ query_type: queryType, table }, duration / 1000)
      return result
    })
    .catch(error => {
      const duration = Date.now() - startTime
      dbQueryDuration?.observe({ query_type: queryType, table }, duration / 1000)
      
      // Track database error as business error
      recordBusinessError({
        errorType: 'DATABASE_ERROR',
        operation: `${queryType} on ${table}`,
        severity: 'HIGH'
      })
      
      throw error
    })
}

/**
 * Track business operation metrics
 */
export function trackBusinessOperation<T>(
  operationType: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  return operation()
    .then(result => {
      const duration = Date.now() - startTime
      
      recordBusinessTransactionDuration({
        transactionType: operationType,
        duration: duration / 1000
      })
      
      return result
    })
    .catch(error => {
      const duration = Date.now() - startTime
      
      recordBusinessTransactionDuration({
        transactionType: operationType,
        duration: duration / 1000
      })
      
      recordBusinessError({
        errorType: getErrorCode(error),
        operation: operationType,
        severity: 'MEDIUM'
      })
      
      throw error
    })
}

/**
 * Create a metrics wrapper for API routes
 */
export function withApiMetrics(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    return withMetrics(request, handler)
  }
}

/**
 * Metrics for server actions
 */
export function withActionMetrics<T extends (...args: unknown[]) => Promise<unknown>>(
  actionName: string,
  action: T
): T {
  return (async (...args: unknown[]) => {
    const startTime = Date.now()

    let role = 'anonymous'
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
      if (token) {
        const payload = await verifyToken(token)
        if (payload) role = payload.role
      }
    } catch {}

    try {
      const result = await action(...args)
      const duration = Date.now() - startTime

      recordBusinessTransactionDuration({
        transactionType: `action_${actionName}`,
        duration: duration / 1000
      })

      recordUserAction({
        actionType: actionName,
        role,
        status: 'SUCCESS'
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      recordBusinessTransactionDuration({
        transactionType: `action_${actionName}`,
        duration: duration / 1000
      })

      recordUserAction({
        actionType: actionName,
        role,
        status: 'FAILED'
      })
      
      recordBusinessError({
        errorType: getErrorCode(error),
        operation: `action_${actionName}`,
        severity: 'MEDIUM'
      })
      
      throw error
    }
  }) as T
}

/**
 * Track stock-related operations
 */
export function trackStockOperation<T>(
  operation: 'movement' | 'adjustment' | 'check' | 'report',
  details: Record<string, unknown>,
  operationFunc: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  return operationFunc()
    .then(result => {
      const duration = Date.now() - startTime
      
      // Record specific stock operation metrics
      if (operation === 'movement' && details.type && details.quantity) {
        // This would be called from the actual stock movement handler
        // with proper product category, warehouse, etc.
      }
      
      recordBusinessTransactionDuration({
        transactionType: `stock_${operation}`,
        duration: duration / 1000
      })
      
      return result
    })
    .catch(error => {
      const duration = Date.now() - startTime
      
      recordBusinessTransactionDuration({
        transactionType: `stock_${operation}`,
        duration: duration / 1000
      })
      
      recordBusinessError({
        errorType: getErrorCode(error),
        operation: `stock_${operation}`,
        severity: 'HIGH' // Stock operations are critical
      })
      
      throw error
    })
}

/**
 * Track document generation operations
 */
export function trackDocumentOperation<T>(
  documentType: string,
  template: string,
  operationFunc: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  
  return operationFunc()
    .then(result => {
      const duration = Date.now() - startTime
      
      recordDocumentGeneration({
        documentType,
        template,
        status: 'SUCCESS',
        duration,
        size: result instanceof Blob ? result.size : undefined
      })
      
      return result
    })
    .catch(error => {
      const duration = Date.now() - startTime
      
      recordDocumentGeneration({
        documentType,
        template,
        status: 'FAILED',
        duration
      })
      
      recordBusinessError({
        errorType: getErrorCode(error),
        operation: `document_generation_${documentType}`,
        severity: 'MEDIUM'
      })
      
      throw error
    })
}

/**
 * User session tracking
 */
export class UserSessionTracker {
  private startTime: number
  private role: string
  
  constructor(role: string) {
    this.startTime = Date.now()
    this.role = role
    
    recordUserLogin({
      role,
      status: 'SUCCESS'
    })
  }
  
  endSession(): void {
    const duration = (Date.now() - this.startTime) / 1000
    recordUserSessionDuration({
      role: this.role,
      duration
    })
  }
  
  trackAction(actionType: string, status: 'SUCCESS' | 'FAILED' = 'SUCCESS'): void {
    recordUserAction({
      actionType,
      role: this.role,
      status
    })
  }
}

/**
 * Initialize metrics tracking
 */
export function initializeMetricsTracking(): void {
  // This function can be called during application startup
  // to ensure metrics are properly initialized
  console.log('Metrics tracking initialized')
}