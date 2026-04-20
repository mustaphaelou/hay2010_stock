"use client"

import * as React from "react"
import { getDashboardStats } from "@/app/actions/dashboard"
import type { DashboardData } from "@/lib/types"

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

        if (abortControllerRef.current?.signal.aborted) return

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
        if (document.visibilityState === "visible") {
          fetchData(true)
        }
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

function useDashboardStats(options?: FetchOptions<DashboardData>) {
  const fetcher = React.useCallback(async (): Promise<DashboardData> => {
    return await getDashboardStats()
  }, [])

  return useSWRLike("dashboard-stats", fetcher, options)
}

function useChartData(
  timeRange: "7d" | "30d" | "90d" | "1y" = "30d",
  options?: FetchOptions<DashboardData>
) {
  const fetcher = React.useCallback(async (): Promise<DashboardData> => {
    return await getDashboardStats()
  }, [])

  return useSWRLike(`chart-data-${timeRange}`, fetcher, options)
}

function useRecentActivity(
  limit: number = 10,
  options?: FetchOptions<DashboardData>
) {
  const fetcher = React.useCallback(async (): Promise<DashboardData> => {
    return await getDashboardStats()
  }, [])

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
  FetchState,
  FetchOptions,
}
