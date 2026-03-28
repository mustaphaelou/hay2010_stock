"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type ViewMode = "grid" | "list" | "compact"
type DateRange = "today" | "7d" | "30d" | "90d" | "1y" | "custom"

interface DashboardFilters {
  search: string
  category: string | null
  status: string | null
  dateRange: DateRange
  customDateStart?: Date
  customDateEnd?: Date
}

interface DashboardState {
  viewMode: ViewMode
  filters: DashboardFilters
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  performanceMetrics: {
    renderTime: number
    dataFetchTime: number
    updateTime: number
  }
}

interface DashboardContextValue extends DashboardState {
  setViewMode: (mode: ViewMode) => void
  setFilters: (filters: Partial<DashboardFilters>) => void
  resetFilters: () => void
  refresh: () => Promise<void>
  retry: () => Promise<void>
  subscribeToUpdates: (callback: (data: unknown) => void) => () => void
  trackPerformance: (metric: keyof DashboardState["performanceMetrics"], value: number) => void
}

const DashboardContext = React.createContext<DashboardContextValue | null>(null)

const defaultFilters: DashboardFilters = {
  search: "",
  category: null,
  status: null,
  dateRange: "30d",
}

const initialState: DashboardState = {
  viewMode: "grid",
  filters: defaultFilters,
  isLoading: false,
  error: null,
  lastUpdated: null,
  performanceMetrics: {
    renderTime: 0,
    dataFetchTime: 0,
    updateTime: 0,
  },
}

interface DashboardProviderProps {
  children: React.ReactNode
  initialViewMode?: ViewMode
  initialFilters?: Partial<DashboardFilters>
  autoRefresh?: boolean
  refreshInterval?: number
  onRefresh?: () => Promise<void>
}

function DashboardProvider({
  children,
  initialViewMode = "grid",
  initialFilters,
  autoRefresh = false,
  refreshInterval = 30000,
  onRefresh,
}: DashboardProviderProps) {
  const [state, dispatch] = React.useReducer(
    (prevState: DashboardState, action: Partial<DashboardState>) => ({
      ...prevState,
      ...action,
    }),
    {
      ...initialState,
      viewMode: initialViewMode,
      filters: { ...defaultFilters, ...initialFilters },
    }
  )

  const subscribersRef = React.useRef<Set<(data: unknown) => void>>(new Set())
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

  const setViewMode = React.useCallback((mode: ViewMode) => {
    dispatch({ viewMode: mode })
  }, [])

  const setFilters = React.useCallback((filters: Partial<DashboardFilters>) => {
    dispatch({
      filters: { ...state.filters, ...filters },
    })
  }, [state.filters])

  const resetFilters = React.useCallback(() => {
    dispatch({ filters: defaultFilters })
  }, [])

  const refresh = React.useCallback(async () => {
    const startTime = performance.now()

    dispatch({ isLoading: true, error: null })

    try {
      await onRefresh?.()

      const endTime = performance.now()
      dispatch({
        isLoading: false,
        lastUpdated: new Date(),
        performanceMetrics: {
          ...state.performanceMetrics,
          dataFetchTime: endTime - startTime,
        },
      })

      subscribersRef.current.forEach((callback) => {
        callback({ type: "refresh", timestamp: new Date() })
      })
    } catch (error) {
      dispatch({
        isLoading: false,
        error: error instanceof Error ? error.message : "An error occurred",
      })
    }
  }, [onRefresh, state.performanceMetrics])

  const retry = React.useCallback(async () => {
    dispatch({ error: null })
    await refresh()
  }, [refresh])

  const subscribeToUpdates = React.useCallback((callback: (data: unknown) => void) => {
    subscribersRef.current.add(callback)
    return () => {
      subscribersRef.current.delete(callback)
    }
  }, [])

  const trackPerformance = React.useCallback(
    (metric: keyof DashboardState["performanceMetrics"], value: number) => {
      dispatch({
        performanceMetrics: {
          ...state.performanceMetrics,
          [metric]: value,
        },
      })
    },
    [state.performanceMetrics]
  )

  React.useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        refresh()
      }, refreshInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [autoRefresh, refreshInterval, refresh])

  const simulateWebSocket = React.useCallback(() => {
    const interval = setInterval(() => {
      const updateData = {
        type: "update",
        timestamp: new Date(),
        data: { random: Math.random() },
      }

      subscribersRef.current.forEach((callback) => {
        callback(updateData)
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  React.useEffect(() => {
    const cleanup = simulateWebSocket()
    return cleanup
  }, [simulateWebSocket])

  const value: DashboardContextValue = {
    ...state,
    setViewMode,
    setFilters,
    resetFilters,
    refresh,
    retry,
    subscribeToUpdates,
    trackPerformance,
  }

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

function useDashboard() {
  const context = React.useContext(DashboardContext)
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider")
  }
  return context
}

function useDashboardFilters() {
  const { filters, setFilters, resetFilters } = useDashboard()
  return { filters, setFilters, resetFilters }
}

function useDashboardViewMode() {
  const { viewMode, setViewMode } = useDashboard()
  return { viewMode, setViewMode }
}

function useDashboardRefresh() {
  const { refresh, retry, isLoading, error, lastUpdated } = useDashboard()
  return { refresh, retry, isLoading, error, lastUpdated }
}

function useRealtimeUpdates(onUpdate: (data: unknown) => void) {
  const { subscribeToUpdates } = useDashboard()

  React.useEffect(() => {
    return subscribeToUpdates(onUpdate)
  }, [subscribeToUpdates, onUpdate])
}

function usePerformanceTracking() {
  const { trackPerformance, performanceMetrics } = useDashboard()

  const measureRender = React.useCallback(
    (callback: () => void) => {
      const start = performance.now()
      callback()
      const end = performance.now()
      trackPerformance("renderTime", end - start)
    },
    [trackPerformance]
  )

  const measureUpdate = React.useCallback(
    (callback: () => void) => {
      const start = performance.now()
      callback()
      const end = performance.now()
      trackPerformance("updateTime", end - start)
    },
    [trackPerformance]
  )

  return { measureRender, measureUpdate, performanceMetrics }
}

export {
  DashboardProvider,
  useDashboard,
  useDashboardFilters,
  useDashboardViewMode,
  useDashboardRefresh,
  useRealtimeUpdates,
  usePerformanceTracking,
}

export type {
  DashboardContextValue,
  DashboardState,
  DashboardFilters,
  ViewMode,
  DateRange,
}
