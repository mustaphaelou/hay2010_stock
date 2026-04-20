export interface DashboardStats {
  clients: number
  suppliers: number
  products: number
  families: number
  salesCount: number
  purchasesCount: number
  lowStockCount: number
  totalStockProducts: number
  monthlyRevenue?: number
  pendingOrders?: number
}

export interface SalesInvoice {
  id_document: number
  numero_piece: string | null
  numero_document: string | null
  montant_ttc: number
  montant_regle: number
  date_document: Date
  partenaire?: {
    nom_partenaire: string
  }
}

export interface DashboardActivity {
  id: string
  title: string
  description: string
  timestamp: Date
  status: 'success' | 'warning' | 'error' | 'info'
  icon?: string
  href?: string
}

export interface PaymentStatusData {
  name: string
  value: number
  fill: string
}

export interface MonthlyDataPoint {
  month: string
  ventes: number
  achats: number
}

export interface KpiCard {
  id: string
  title: string
  value: number
  description: string
  icon?: string
  iconColor?: string
  variant: 'default' | 'success' | 'warning' | 'info' | 'error'
  trend?: {
    value: number
    direction: 'up' | 'down'
    label?: string
  }
}

export interface GaugeConfig {
  id: string
  title: string
  description: string
  value: number
  thresholds: Array<{
    value: number
    label: string
    color: string
  }>
}
