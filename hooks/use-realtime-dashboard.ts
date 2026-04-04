"use client"

import * as React from "react"

interface DashboardStats {
  clients: number
  suppliers: number
  products: number
  families: number
  salesCount: number
  purchasesCount: number
}

interface RealtimeDashboardOptions {
  onStatsUpdate?: (stats: Partial<DashboardStats>) => void
  onDocumentInsert?: (document: Record<string, unknown>) => void
  onDocumentUpdate?: (document: Record<string, unknown>) => void
  onPartnerInsert?: (partner: Record<string, unknown>) => void
  onProductInsert?: (product: Record<string, unknown>) => void
  enabled?: boolean
}

interface RealtimeDashboardReturn {
  isConnected: boolean
  lastUpdate: Date | null
  error: Error | null
  reconnect: () => void
}

// Stub implementation - Realtime features disabled (Supabase removed)
// To re-enable realtime, implement WebSocket connection or polling mechanism
export function useRealtimeDashboard(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_options: RealtimeDashboardOptions = {}
): RealtimeDashboardReturn {
  const [isConnected] = React.useState(false)
  const [lastUpdate] = React.useState<Date | null>(null)
  const [error] = React.useState<Error | null>(null)

	const reconnect = React.useCallback(() => {
		// No-op - realtime disabled
	}, [])

  return {
    isConnected,
    lastUpdate,
    error,
    reconnect,
  }
}

// Stub implementation for presence - Realtime features disabled
export function useDashboardPresence(
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_roomId: string = "dashboard"
) {
  const [activeUsers] = React.useState<
    Array<{ id: string; name: string; avatar?: string }>
  >([])

  return { activeUsers }
}

export type { DashboardStats, RealtimeDashboardOptions, RealtimeDashboardReturn }
