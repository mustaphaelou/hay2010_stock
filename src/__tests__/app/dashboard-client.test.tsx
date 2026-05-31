import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DashboardClient } from '@/app/(dashboard)/dashboard-client'
import type { DashboardStats, MonthlyDataPoint } from '@/lib/types'

const mockStats: DashboardStats = {
  clients: 10,
  suppliers: 5,
  products: 100,
  families: 5,
  salesCount: 20,
  purchasesCount: 15,
  lowStockCount: 2,
  totalStockProducts: 1000,
  totalSalesAmount: 50000,
  totalPurchasesAmount: 30000,
  paymentRate: 75,
  stockAvailability: 85,
  unpaidCount: 5,
  unpaidTotal: 10000,
}

const mockMonthlyData: MonthlyDataPoint[] = [
  { month: 'Jan', ventes: 10000, achats: 6000 },
  { month: 'Feb', ventes: 12000, achats: 8000 },
]

vi.mock('@/components/dashboard/enhanced/enhanced-dashboard-view', () => ({
  EnhancedDashboardView: () => <div data-testid="enhanced-dashboard-view">Dashboard View Mock</div>
}))

describe('DashboardClient', () => {
  it('should render without errors', () => {
    const { container } = render(
      <DashboardClient
        stats={mockStats}
        recentDocs={[]}
        salesInvoices={[]}
        monthlyData={mockMonthlyData}
        activities={[]}
        topProducts={[]}
      />
    )
    expect(container).toBeInTheDocument()
  })
})
