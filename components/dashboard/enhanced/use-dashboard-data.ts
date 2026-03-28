"use client"

import * as React from "react"

interface FetchState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  isValidating: boolean
}

interface FetchOptions<T> {
  initialData?: T
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  refreshInterval?: number
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

function useSWRLike<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: FetchOptions<T> = {}
): FetchState<T> & {
  mutate: (data?: T | ((prev: T | null) => T) | null) => Promise<void>
  revalidate: () => Promise<void>
} {
  const {
    initialData,
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    refreshInterval,
    onSuccess,
    onError,
  } = options

  const [state, setState] = React.useState<FetchState<T>>({
    data: initialData ?? null,
    isLoading: !initialData,
    error: null,
    isValidating: false,
  })

  const cacheRef = React.useRef<Map<string, { data: T; timestamp: number }>>(new Map())
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const fetchData = React.useCallback(
    async (isRevalidation = false) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      setState((prev) => ({
        ...prev,
        isLoading: !isRevalidation,
        isValidating: isRevalidation,
        error: null,
      }))

      try {
        const cached = cacheRef.current.get(key)
        const now = Date.now()
        const cacheTime = 5 * 60 * 1000

        if (cached && now - cached.timestamp < cacheTime && !isRevalidation) {
          setState({
            data: cached.data,
            isLoading: false,
            error: null,
            isValidating: false,
          })
          onSuccess?.(cached.data)
          return
        }

        const data = await fetcher()

        cacheRef.current.set(key, { data, timestamp: now })

        setState({
          data,
          isLoading: false,
          error: null,
          isValidating: false,
        })

        onSuccess?.(data)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error("Unknown error"),
          isValidating: false,
        }))

        onError?.(error instanceof Error ? error : new Error("Unknown error"))
      }
    },
    [key, fetcher, onSuccess, onError]
  )

  const mutate = React.useCallback(
    async (data?: T | ((prev: T | null) => T) | null) => {
      if (typeof data === "function") {
        setState((prev) => {
          const newData = (data as (prev: T | null) => T)(prev.data)
          cacheRef.current.set(key, { data: newData, timestamp: Date.now() })
          return { ...prev, data: newData }
        })
      } else if (data !== undefined && data !== null) {
        cacheRef.current.set(key, { data, timestamp: Date.now() })
        setState((prev) => ({ ...prev, data }))
      } else if (data === null) {
        setState((prev) => ({ ...prev, data: null }))
      }
    },
    [key]
  )

  const revalidate = React.useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  React.useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchData(true)
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, fetchData])

  React.useEffect(() => {
    if (revalidateOnFocus) {
      const handleFocus = () => {
        fetchData(true)
      }

      window.addEventListener("focus", handleFocus)
      return () => window.removeEventListener("focus", handleFocus)
    }
  }, [revalidateOnFocus, fetchData])

  React.useEffect(() => {
    if (revalidateOnReconnect) {
      const handleOnline = () => {
        fetchData(true)
      }

      window.addEventListener("online", handleOnline)
      return () => window.removeEventListener("online", handleOnline)
    }
  }, [revalidateOnReconnect, fetchData])

  return {
    ...state,
    mutate,
    revalidate,
  }
}

interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  totalCustomers: number
  revenueGrowth: number
  ordersGrowth: number
  productsGrowth: number
  customersGrowth: number
}

interface ChartDataPoint {
  date: string
  revenue: number
  orders: number
  visitors: number
}

interface ActivityItem {
  id: string
  title: string
  description: string
  timestamp: Date
  status: "success" | "warning" | "error" | "info"
}

function useDashboardStats(options?: FetchOptions<DashboardStats>) {
  const fetcher = React.useCallback(async (): Promise<DashboardStats> => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    return {
      totalRevenue: 125430.5,
      totalOrders: 1247,
      totalProducts: 483,
      totalCustomers: 2156,
      revenueGrowth: 12.5,
      ordersGrowth: 8.3,
      productsGrowth: 15.2,
      customersGrowth: 23.1,
    }
  }, [])

  return useSWRLike("dashboard-stats", fetcher, options)
}

function useChartData(
  timeRange: "7d" | "30d" | "90d" | "1y" = "30d",
  options?: FetchOptions<ChartDataPoint[]>
) {
  const fetcher = React.useCallback(async (): Promise<ChartDataPoint[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const now = new Date()
    const data: ChartDataPoint[] = []
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365

    for (let i = days; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      data.push({
        date: date.toISOString().split("T")[0],
        revenue: Math.floor(Math.random() * 10000) + 5000,
        orders: Math.floor(Math.random() * 100) + 20,
        visitors: Math.floor(Math.random() * 500) + 100,
      })
    }

    return data
  }, [timeRange])

  return useSWRLike(`chart-data-${timeRange}`, fetcher, options)
}

function useRecentActivity(
  limit: number = 10,
  options?: FetchOptions<ActivityItem[]>
) {
  const fetcher = React.useCallback(async (): Promise<ActivityItem[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400))

    const activities: ActivityItem[] = [
      {
        id: "1",
        title: "New order received",
        description: "Order #1234 from John Doe",
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        status: "success",
      },
      {
        id: "2",
        title: "Low stock alert",
        description: "Product SKU-567 is running low",
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        status: "warning",
      },
      {
        id: "3",
        title: "Payment processed",
        description: "Payment for order #1230 confirmed",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: "success",
      },
      {
        id: "4",
        title: "Customer complaint",
        description: "Issue reported by Jane Smith",
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        status: "error",
      },
      {
        id: "5",
        title: "New product added",
        description: "Product 'Widget Pro' added to catalog",
        timestamp: new Date(Date.now() - 1000 * 60 * 120),
        status: "info",
      },
    ]

    return activities.slice(0, limit)
  }, [limit])

  return useSWRLike(`recent-activity-${limit}`, fetcher, options)
}

function useOptimisticUpdate<T>(
  key: string,
  mutationFn: (data: T) => Promise<T>,
  options?: { onSuccess?: (data: T) => void; onError?: (error: Error) => void }
) {
  const { mutate, revalidate, ...state } = useSWRLike<T>(
    key,
    async () => {
      throw new Error("Fetcher required")
    },
    { initialData: null as unknown as T }
  )

  const optimisticMutate = React.useCallback(
    async (newData: T) => {
      const previousData = state.data

      try {
        mutate(newData)

        const result = await mutationFn(newData)
        mutate(result)
        options?.onSuccess?.(result)
      } catch (error) {
        mutate(previousData)
        options?.onError?.(error instanceof Error ? error : new Error("Unknown error"))
      }
    },
    [mutationFn, mutate, state.data, options]
  )

  return {
    ...state,
    optimisticMutate,
    revalidate,
  }
}

export {
  useSWRLike,
  useDashboardStats,
  useChartData,
  useRecentActivity,
  useOptimisticUpdate,
}

export type {
  DashboardStats,
  ChartDataPoint,
  ActivityItem,
  FetchState,
  FetchOptions,
}
