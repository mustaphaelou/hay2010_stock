/**
 * Business Metrics for Stock Management Application
 * 
 * Tracks key business indicators for monitoring and analytics.
 */

import client from 'prom-client'

// Create a separate registry for business metrics
const businessRegistry = new client.Registry()

// Stock Movement Metrics
export const stockMovementCounter = new client.Counter({
  name: 'stock_movements_total',
  help: 'Total number of stock movements',
  labelNames: ['type', 'product_category', 'warehouse'],
  registers: [businessRegistry]
})

export const stockMovementValue = new client.Counter({
  name: 'stock_movement_value_total',
  help: 'Total value of stock movements',
  labelNames: ['type', 'product_category', 'warehouse', 'currency'],
  registers: [businessRegistry]
})

export const stockMovementDuration = new client.Histogram({
  name: 'stock_movement_duration_seconds',
  help: 'Duration of stock movement processing',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [businessRegistry]
})

// Stock Level Metrics
export const stockLevelGauge = new client.Gauge({
  name: 'stock_level_current',
  help: 'Current stock levels',
  labelNames: ['product_id', 'product_name', 'warehouse', 'category'],
  registers: [businessRegistry]
})

export const lowStockAlertCounter = new client.Counter({
  name: 'low_stock_alerts_total',
  help: 'Total number of low stock alerts',
  labelNames: ['product_id', 'product_name', 'warehouse', 'severity'],
  registers: [businessRegistry]
})

// Document Generation Metrics
export const documentGenerationCounter = new client.Counter({
  name: 'documents_generated_total',
  help: 'Total number of documents generated',
  labelNames: ['document_type', 'template', 'status'],
  registers: [businessRegistry]
})

export const documentGenerationDuration = new client.Histogram({
  name: 'document_generation_duration_seconds',
  help: 'Duration of document generation',
  labelNames: ['document_type'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [businessRegistry]
})

export const documentGenerationSize = new client.Histogram({
  name: 'document_generation_size_bytes',
  help: 'Size of generated documents',
  labelNames: ['document_type'],
  buckets: [1024, 5120, 10240, 51200, 102400, 512000, 1048576],
  registers: [businessRegistry]
})

// User Activity Metrics
export const userLoginCounter = new client.Counter({
  name: 'user_logins_total',
  help: 'Total number of user logins',
  labelNames: ['role', 'status'],
  registers: [businessRegistry]
})

export const userSessionDuration = new client.Histogram({
  name: 'user_session_duration_seconds',
  help: 'Duration of user sessions',
  labelNames: ['role'],
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800],
  registers: [businessRegistry]
})

export const userActionCounter = new client.Counter({
  name: 'user_actions_total',
  help: 'Total number of user actions',
  labelNames: ['action_type', 'role', 'status'],
  registers: [businessRegistry]
})

// Business Performance Metrics
export const orderFulfillmentTime = new client.Histogram({
  name: 'order_fulfillment_time_seconds',
  help: 'Time to fulfill orders',
  labelNames: ['order_type', 'priority'],
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400],
  registers: [businessRegistry]
})

export const inventoryTurnoverRate = new client.Gauge({
  name: 'inventory_turnover_rate',
  help: 'Inventory turnover rate (times per period)',
  labelNames: ['product_category', 'warehouse', 'period'],
  registers: [businessRegistry]
})

export const stockAccuracyRate = new client.Gauge({
  name: 'stock_accuracy_rate',
  help: 'Stock accuracy rate (percentage)',
  labelNames: ['warehouse', 'category'],
  registers: [businessRegistry]
})

// Revenue and Cost Metrics
export const revenueCounter = new client.Counter({
  name: 'revenue_total',
  help: 'Total revenue from sales',
  labelNames: ['product_category', 'customer_type', 'payment_method'],
  registers: [businessRegistry]
})

export const costCounter = new client.Counter({
  name: 'cost_total',
  help: 'Total cost of goods',
  labelNames: ['product_category', 'supplier', 'purchase_type'],
  registers: [businessRegistry]
})

export const profitMarginGauge = new client.Gauge({
  name: 'profit_margin_percent',
  help: 'Profit margin percentage',
  labelNames: ['product_category', 'period'],
  registers: [businessRegistry]
})

// System Business Metrics
export const apiBusinessRequestCounter = new client.Counter({
  name: 'api_business_requests_total',
  help: 'Total number of business API requests',
  labelNames: ['endpoint', 'method', 'status'],
  registers: [businessRegistry]
})

export const businessTransactionDuration = new client.Histogram({
  name: 'business_transaction_duration_seconds',
  help: 'Duration of business transactions',
  labelNames: ['transaction_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [businessRegistry]
})

// Error Metrics for Business Operations
export const businessErrorCounter = new client.Counter({
  name: 'business_errors_total',
  help: 'Total number of business operation errors',
  labelNames: ['error_type', 'operation', 'severity'],
  registers: [businessRegistry]
})

// Custom metric collectors
export const stockMetricsCollector = new client.Gauge({
  name: 'stock_metrics_collector',
  help: 'Collects various stock metrics on demand',
  labelNames: ['metric_type', 'warehouse'],
  registers: [businessRegistry]
})

/**
 * Record a stock movement
 */
export function recordStockMovement(params: {
  type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT'
  productCategory: string
  warehouse: string
  quantity: number
  value?: number
  currency?: string
  duration?: number
}) {
  const { type, productCategory, warehouse, quantity, value, currency, duration } = params
  
  stockMovementCounter.inc({ type, product_category: productCategory, warehouse }, quantity)
  
  if (value && currency) {
    stockMovementValue.inc({ 
      type, 
      product_category: productCategory, 
      warehouse, 
      currency 
    }, value)
  }
  
  if (duration) {
    stockMovementDuration.observe({ type }, duration / 1000) // Convert ms to seconds
  }
}

/**
 * Record stock level
 */
export function recordStockLevel(params: {
  productId: string
  productName: string
  warehouse: string
  category: string
  quantity: number
}) {
  const { productId, productName, warehouse, category, quantity } = params
  stockLevelGauge.set({ product_id: productId, product_name: productName, warehouse, category }, quantity)
}

/**
 * Record low stock alert
 */
export function recordLowStockAlert(params: {
  productId: string
  productName: string
  warehouse: string
  severity: 'LOW' | 'CRITICAL'
  currentQuantity: number
  minimumQuantity: number
}) {
  const { productId, productName, warehouse, severity } = params
  lowStockAlertCounter.inc({ product_id: productId, product_name: productName, warehouse, severity })
}

/**
 * Record document generation
 */
export function recordDocumentGeneration(params: {
  documentType: string
  template: string
  status: 'SUCCESS' | 'FAILED'
  duration?: number
  size?: number
}) {
  const { documentType, template, status, duration, size } = params
  
  documentGenerationCounter.inc({ document_type: documentType, template, status })
  
  if (duration) {
    documentGenerationDuration.observe({ document_type: documentType }, duration / 1000)
  }
  
  if (size) {
    documentGenerationSize.observe({ document_type: documentType }, size)
  }
}

/**
 * Record user login
 */
export function recordUserLogin(params: {
  role: string
  status: 'SUCCESS' | 'FAILED'
}) {
  const { role, status } = params
  userLoginCounter.inc({ role, status })
}

/**
 * Record user session duration
 */
export function recordUserSessionDuration(params: {
  role: string
  duration: number // in seconds
}) {
  const { role, duration } = params
  userSessionDuration.observe({ role }, duration)
}

/**
 * Record user action
 */
export function recordUserAction(params: {
  actionType: string
  role: string
  status: 'SUCCESS' | 'FAILED'
}) {
  const { actionType, role, status } = params
  userActionCounter.inc({ action_type: actionType, role, status })
}

/**
 * Record order fulfillment time
 */
export function recordOrderFulfillmentTime(params: {
  orderType: string
  priority: 'NORMAL' | 'HIGH' | 'URGENT'
  duration: number // in seconds
}) {
  const { orderType, priority, duration } = params
  orderFulfillmentTime.observe({ order_type: orderType, priority }, duration)
}

/**
 * Record revenue
 */
export function recordRevenue(params: {
  productCategory: string
  customerType: string
  paymentMethod: string
  amount: number
}) {
  const { productCategory, customerType, paymentMethod, amount } = params
  revenueCounter.inc({ product_category: productCategory, customer_type: customerType, payment_method: paymentMethod }, amount)
}

/**
 * Record cost
 */
export function recordCost(params: {
  productCategory: string
  supplier: string
  purchaseType: string
  amount: number
}) {
  const { productCategory, supplier, purchaseType, amount } = params
  costCounter.inc({ product_category: productCategory, supplier, purchase_type: purchaseType }, amount)
}

/**
 * Record business error
 */
export function recordBusinessError(params: {
  errorType: string
  operation: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}) {
  const { errorType, operation, severity } = params
  businessErrorCounter.inc({ error_type: errorType, operation, severity })
}

/**
 * Record API business request
 */
export function recordApiBusinessRequest(params: {
  endpoint: string
  method: string
  status: string
}) {
  const { endpoint, method, status } = params
  apiBusinessRequestCounter.inc({ endpoint, method, status })
}

/**
 * Record business transaction duration
 */
export function recordBusinessTransactionDuration(params: {
  transactionType: string
  duration: number // in seconds
}) {
  const { transactionType, duration } = params
  businessTransactionDuration.observe({ transaction_type: transactionType }, duration)
}

/**
 * Update inventory turnover rate
 */
export function updateInventoryTurnoverRate(params: {
  productCategory: string
  warehouse: string
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  rate: number
}) {
  const { productCategory, warehouse, period, rate } = params
  inventoryTurnoverRate.set({ product_category: productCategory, warehouse, period }, rate)
}

/**
 * Update stock accuracy rate
 */
export function updateStockAccuracyRate(params: {
  warehouse: string
  category: string
  accuracy: number // percentage
}) {
  const { warehouse, category, accuracy } = params
  stockAccuracyRate.set({ warehouse, category }, accuracy)
}

/**
 * Update profit margin
 */
export function updateProfitMargin(params: {
  productCategory: string
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  margin: number // percentage
}) {
  const { productCategory, period, margin } = params
  profitMarginGauge.set({ product_category: productCategory, period }, margin)
}

/**
 * Get all business metrics as Prometheus format
 */
export async function getBusinessMetrics(): Promise<string> {
  return await businessRegistry.metrics()
}

/**
 * Get business metrics registry
 */
export function getBusinessRegistry(): client.Registry {
  return businessRegistry
}

/**
 * Reset all business metrics (for testing only)
 */
export function resetBusinessMetrics(): void {
  businessRegistry.resetMetrics()
}

/**
 * Initialize business metrics collection
 */
export function initializeBusinessMetrics(): void {
  // Register the registry to collect default metrics
  client.collectDefaultMetrics({ register: businessRegistry })
  
  // Add custom collectors
  businessRegistry.setDefaultLabels({
    app: 'hay2010-stock',
    environment: process.env.NODE_ENV || 'development'
  })
}

// Initialize on import
initializeBusinessMetrics()