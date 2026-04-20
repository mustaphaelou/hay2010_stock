/* eslint-disable react-refresh/only-export-components */
"use client"

import * as React from "react"
import { getDashboardStats } from "@/app/actions/dashboard"
import type { DashboardData } from "@/lib/types"

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
  data: DashboardData | null
  performanceMetrics: {
    renderTime: number
    dataFetchTime: number
    updateTime: number
  }
}

type DashboardAction =
  | { type: "SET_VIEW_MODE"; payload: ViewMode }
  | { type: "SET_FILTERS"; payload: Partial<DashboardFilters> }
  | { type: "RESET_FILTERS" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LAST_UPDATED"; payload: Date }
  | { type: "SET_DATA"; payload: DashboardData }
  | { type: "SET_PERFORMANCE_METRIC"; payload: { key: keyof DashboardState["performanceMetrics"]; value: number } }
  | { type: "RESET" }

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
  data: null,
  performanceMetrics: {
    renderTime: 0,
    dataFetchTime: 0,
    updateTime: 0,
  },
}

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.payload }
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.payload } }
    case "RESET_FILTERS":
      return { ...state, filters: defaultFilters }
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false }
    case "SET_LAST_UPDATED":
      return { ...state, lastUpdated: action.payload, isLoading: false }
    case "SET_DATA":
      return { ...state, data: action.payload, isLoading: false, error: null }
    case "SET_PERFORMANCE_METRIC":
      return {
        ...state,
        performanceMetrics: {
          ...state.performanceMetrics,
          [action.payload.key]: action.payload.value,
        },
      }
    case "RESET":
      return initialState
    default:
      return state
  }
}

interface DashboardProviderProps {
  children: React.ReactNode
  initialViewMode?: ViewMode
  initialFilters?: Partial<DashboardFilters>
  autoRefresh?: boolean
  refreshInterval?: number
  initialData?: DashboardData
}

function DashboardProvider({
  children,
  initialViewMode = "grid",
  initialFilters,
  autoRefresh = false,
  refreshInterval = 30000,
  initialData,
}: DashboardProviderProps) {
  const [state, dispatch] = React.useReducer(dashboardReducer, {
    ...initialState,
    viewMode: initialViewMode,
    filters: { ...defaultFilters, ...initialFilters },
    data: initialData ?? null,
  })

  const subscribersRef = React.useRef<Set<(data: unknown) => void>>(new Set())
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const isRefreshingRef = React.useRef(false)

  const setViewMode = React.useCallback((mode: ViewMode) => {
    dispatch({ type: "SET_VIEW_MODE", payload: mode })
  }, [])

  const setFilters = React.useCallback((filters: Partial<DashboardFilters>) => {
    dispatch({ type: "SET_FILTERS", payload: filters })
  }, [])

  const resetFilters = React.useCallback(() => {
    dispatch({ type: "RESET_FILTERS" })
  }, [])

  const refresh = React.useCallback(async () => {
    if (isRefreshingRef.current) return
    isRefreshingRef.current = true
    const startTime = performance.now()

    dispatch({ type: "SET_LOADING", payload: true })

    try {
      const data = await getDashboardStats()
      const endTime = performance.now()

      dispatch({ type: "SET_DATA", payload: data })
      dispatch({ type: "SET_LAST_UPDATED", payload: new Date() })
      dispatch({
        type: "SET_PERFORMANCE_METRIC",
        payload: { key: "dataFetchTime", value: endTime - startTime },
      })

      subscribersRef.current.forEach((callback) => {
        callback({ type: "refresh", timestamp: new Date(), data })
      })
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : "Une erreur est survenue",
      })
    } finally {
      isRefreshingRef.current = false
    }
  }, [])

  const retry = React.useCallback(async () => {
    dispatch({ type: "SET_ERROR", payload: null })
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
        type: "SET_PERFORMANCE_METRIC",
        payload: { key: metric, value },
      })
    },
    []
  )

  React.useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          refresh()
        }
      }, refreshInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [autoRefresh, refreshInterval, refresh])

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
  DashboardAction,
}
