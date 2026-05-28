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