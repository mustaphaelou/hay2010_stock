import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import client from 'prom-client'
import {
  stockMovementCounter,
  stockMovementValue,
  stockMovementDuration,
  stockLevelGauge,
  lowStockAlertCounter,
  documentGenerationCounter,
  documentGenerationDuration,
  documentGenerationSize,
  userLoginCounter,
  userSessionDuration,
  userActionCounter,
  orderFulfillmentTime,
  inventoryTurnoverRate,
  stockAccuracyRate,
  revenueCounter,
  costCounter,
  profitMarginGauge,
  apiBusinessRequestCounter,
  businessTransactionDuration,
  businessErrorCounter,
  recordStockMovement,
  recordStockLevel,
  recordLowStockAlert,
  recordDocumentGeneration,
  recordUserLogin,
  recordUserSessionDuration,
  recordUserAction,
  recordOrderFulfillmentTime,
  recordRevenue,
  recordCost,
  recordBusinessError,
  recordApiBusinessRequest,
  recordBusinessTransactionDuration,
  updateInventoryTurnoverRate,
  updateStockAccuracyRate,
  updateProfitMargin,
  getBusinessMetrics,
  getBusinessRegistry,
  resetBusinessMetrics
} from '@/lib/monitoring/business-metrics'

describe('Business Metrics', () => {
  let registry: client.Registry

  beforeEach(() => {
    // Reset metrics before each test
    resetBusinessMetrics()
    registry = getBusinessRegistry()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Stock Movement Metrics', () => {
    it('should record stock movement counter', async () => {
      recordStockMovement({
        type: 'INBOUND',
        productCategory: 'Electronics',
        warehouse: 'Main Warehouse',
        quantity: 10
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('stock_movements_total')
      expect(metrics).toContain('type="INBOUND"')
      expect(metrics).toContain('product_category="Electronics"')
      expect(metrics).toContain('warehouse="Main Warehouse"')
    })

    it('should record stock movement value', async () => {
      recordStockMovement({
        type: 'OUTBOUND',
        productCategory: 'Furniture',
        warehouse: 'West Warehouse',
        quantity: 5,
        value: 2500,
        currency: 'USD'
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('stock_movement_value_total')
      expect(metrics).toContain('type="OUTBOUND"')
      expect(metrics).toContain('currency="USD"')
    })

    it('should record stock movement duration', async () => {
      recordStockMovement({
        type: 'ADJUSTMENT',
        productCategory: 'Office Supplies',
        warehouse: 'East Warehouse',
        quantity: 3,
        duration: 1500 // 1.5 seconds
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('stock_movement_duration_seconds')
      expect(metrics).toContain('type="ADJUSTMENT"')
    })
  })

  describe('Stock Level Metrics', () => {
    it('should record stock level gauge', async () => {
      recordStockLevel({
        productId: 'prod-123',
        productName: 'Laptop',
        warehouse: 'Main Warehouse',
        category: 'Electronics',
        quantity: 25
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('stock_level_current')
      expect(metrics).toContain('product_id="prod-123"')
      expect(metrics).toContain('product_name="Laptop"')
      expect(metrics).toContain('quantity="25"')
    })

    it('should record low stock alert', async () => {
      recordLowStockAlert({
        productId: 'prod-456',
        productName: 'Mouse',
        warehouse: 'Main Warehouse',
        severity: 'CRITICAL',
        currentQuantity: 2,
        minimumQuantity: 10
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('low_stock_alerts_total')
      expect(metrics).toContain('severity="CRITICAL"')
      expect(metrics).toContain('product_id="prod-456"')
    })
  })

  describe('Document Generation Metrics', () => {
    it('should record document generation counter', async () => {
      recordDocumentGeneration({
        documentType: 'INVOICE',
        template: 'COMPANY_A',
        status: 'SUCCESS'
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('documents_generated_total')
      expect(metrics).toContain('document_type="INVOICE"')
      expect(metrics).toContain('template="COMPANY_A"')
      expect(metrics).toContain('status="SUCCESS"')
    })

    it('should record failed document generation', async () => {
      recordDocumentGeneration({
        documentType: 'REPORT',
        template: 'DEFAULT',
        status: 'FAILED'
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('status="FAILED"')
    })

    it('should record document generation duration and size', async () => {
      recordDocumentGeneration({
        documentType: 'DELIVERY_NOTE',
        template: 'STANDARD',
        status: 'SUCCESS',
        duration: 3000, // 3 seconds
        size: 204800 // 200KB
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('document_generation_duration_seconds')
      expect(metrics).toContain('document_generation_size_bytes')
    })
  })

  describe('User Activity Metrics', () => {
    it('should record user login', async () => {
      recordUserLogin({
        role: 'ADMIN',
        status: 'SUCCESS'
      })

      recordUserLogin({
        role: 'USER',
        status: 'FAILED'
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('user_logins_total')
      expect(metrics).toContain('role="ADMIN"')
      expect(metrics).toContain('status="SUCCESS"')
      expect(metrics).toContain('role="USER"')
      expect(metrics).toContain('status="FAILED"')
    })

    it('should record user session duration', async () => {
      recordUserSessionDuration({
        role: 'MANAGER',
        duration: 3600 // 1 hour
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('user_session_duration_seconds')
      expect(metrics).toContain('role="MANAGER"')
    })

    it('should record user action', async () => {
      recordUserAction({
        actionType: 'STOCK_ADJUSTMENT',
        role: 'USER',
        status: 'SUCCESS'
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('user_actions_total')
      expect(metrics).toContain('action_type="STOCK_ADJUSTMENT"')
      expect(metrics).toContain('role="USER"')
      expect(metrics).toContain('status="SUCCESS"')
    })
  })

  describe('Business Performance Metrics', () => {
    it('should record order fulfillment time', async () => {
      recordOrderFulfillmentTime({
        orderType: 'STANDARD',
        priority: 'NORMAL',
        duration: 1800 // 30 minutes
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('order_fulfillment_time_seconds')
      expect(metrics).toContain('order_type="STANDARD"')
      expect(metrics).toContain('priority="NORMAL"')
    })

    it('should update inventory turnover rate', async () => {
      updateInventoryTurnoverRate({
        productCategory: 'Electronics',
        warehouse: 'Main Warehouse',
        period: 'MONTHLY',
        rate: 4.5
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('inventory_turnover_rate')
      expect(metrics).toContain('product_category="Electronics"')
      expect(metrics).toContain('period="MONTHLY"')
      expect(metrics).toContain('4.5')
    })

    it('should update stock accuracy rate', async () => {
      updateStockAccuracyRate({
        warehouse: 'Main Warehouse',
        category: 'All',
        accuracy: 98.5
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('stock_accuracy_rate')
      expect(metrics).toContain('warehouse="Main Warehouse"')
      expect(metrics).toContain('98.5')
    })
  })

  describe('Revenue and Cost Metrics', () => {
    it('should record revenue', async () => {
      recordRevenue({
        productCategory: 'Electronics',
        customerType: 'RETAIL',
        paymentMethod: 'CREDIT_CARD',
        amount: 1500.75
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('revenue_total')
      expect(metrics).toContain('product_category="Electronics"')
      expect(metrics).toContain('customer_type="RETAIL"')
      expect(metrics).toContain('payment_method="CREDIT_CARD"')
    })

    it('should record cost', async () => {
      recordCost({
        productCategory: 'Raw Materials',
        supplier: 'Supplier Inc',
        purchaseType: 'BULK',
        amount: 5000.25
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('cost_total')
      expect(metrics).toContain('product_category="Raw Materials"')
      expect(metrics).toContain('supplier="Supplier Inc"')
      expect(metrics).toContain('purchase_type="BULK"')
    })

    it('should update profit margin', async () => {
      updateProfitMargin({
        productCategory: 'Electronics',
        period: 'WEEKLY',
        margin: 35.2
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('profit_margin_percent')
      expect(metrics).toContain('product_category="Electronics"')
      expect(metrics).toContain('period="WEEKLY"')
      expect(metrics).toContain('35.2')
    })
  })

  describe('System Business Metrics', () => {
    it('should record API business request', async () => {
      recordApiBusinessRequest({
        endpoint: '/api/stock/movements',
        method: 'POST',
        status: '201'
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('api_business_requests_total')
      expect(metrics).toContain('endpoint="/api/stock/movements"')
      expect(metrics).toContain('method="POST"')
      expect(metrics).toContain('status="201"')
    })

    it('should record business transaction duration', async () => {
      recordBusinessTransactionDuration({
        transactionType: 'stock_reconciliation',
        duration: 2.5
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('business_transaction_duration_seconds')
      expect(metrics).toContain('transaction_type="stock_reconciliation"')
    })

    it('should record business error', async () => {
      recordBusinessError({
        errorType: 'INSUFFICIENT_STOCK',
        operation: 'stock_outbound',
        severity: 'HIGH'
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('business_errors_total')
      expect(metrics).toContain('error_type="INSUFFICIENT_STOCK"')
      expect(metrics).toContain('operation="stock_outbound"')
      expect(metrics).toContain('severity="HIGH"')
    })
  })

  describe('Metrics Registry', () => {
    it('should return metrics in Prometheus format', async () => {
      // Record some metrics
      recordStockMovement({
        type: 'INBOUND',
        productCategory: 'Test',
        warehouse: 'Test',
        quantity: 1
      })

      const metrics = await getBusinessMetrics()
      
      // Should contain Prometheus format
      expect(metrics).toContain('# HELP')
      expect(metrics).toContain('# TYPE')
      expect(metrics).toContain('stock_movements_total')
      
      // Should contain default labels
      expect(metrics).toContain('app="hay2010-stock"')
      expect(metrics).toContain(`environment="${process.env.NODE_ENV || 'development'}"`)
    })

    it('should reset metrics', async () => {
      // Record some metrics
      recordStockMovement({
        type: 'INBOUND',
        productCategory: 'Test',
        warehouse: 'Test',
        quantity: 1
      })

      const metricsBefore = await getBusinessMetrics()
      expect(metricsBefore).toContain('stock_movements_total 1')
      
      // Reset metrics
      resetBusinessMetrics()
      
      const metricsAfter = await getBusinessMetrics()
      expect(metricsAfter).toContain('stock_movements_total 0')
    })

    it('should return registry instance', () => {
      const reg = getBusinessRegistry()
      expect(reg).toBeInstanceOf(client.Registry)
    })
  })

  describe('Metric Labels and Values', () => {
    it('should handle special characters in labels', async () => {
      recordStockMovement({
        type: 'INBOUND',
        productCategory: 'Office & Supplies',
        warehouse: 'Warehouse "A"',
        quantity: 1
      })

      const metrics = await getBusinessMetrics()
      // Labels should be properly escaped in Prometheus format
      expect(metrics).toContain('product_category="Office & Supplies"')
    })

    it('should handle numeric values correctly', async () => {
      recordStockLevel({
        productId: 'prod-123',
        productName: 'Test',
        warehouse: 'Test',
        category: 'Test',
        quantity: 0
      })

      recordStockLevel({
        productId: 'prod-456',
        productName: 'Test',
        warehouse: 'Test',
        category: 'Test',
        quantity: 1000000
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('quantity="0"')
      expect(metrics).toContain('quantity="1000000"')
    })

    it('should handle decimal values in gauges', async () => {
      updateProfitMargin({
        productCategory: 'Test',
        period: 'MONTHLY',
        margin: 25.75
      })

      const metrics = await getBusinessMetrics()
      expect(metrics).toContain('25.75')
    })
  })

  describe('Concurrent Metric Updates', () => {
    it('should handle concurrent metric increments', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => {
        return Promise.resolve().then(() => {
          recordStockMovement({
            type: i % 2 === 0 ? 'INBOUND' : 'OUTBOUND',
            productCategory: 'Test',
            warehouse: 'Test',
            quantity: 1
          })
        })
      })

      await Promise.all(promises)

      const metrics = await getBusinessMetrics()
      // Should have recorded 10 movements total
      const match = metrics.match(/stock_movements_total\{[^}]*\} (\d+)/)
      expect(match).not.toBeNull()
      const total = parseInt(match![1])
      expect(total).toBe(10)
    })
  })
})