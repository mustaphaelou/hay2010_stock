"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number | ((index: number, item: T) => number)
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  onLoadMore?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  loading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  className?: string
  itemClassName?: string
  getItemKey: (item: T, index: number) => string | number
}

function VirtualizedListInner<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  loading = false,
  emptyMessage = "No items",
  emptyDescription = "There are no items to display",
  className,
  itemClassName,
  getItemKey,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const getItemHeight = React.useCallback(
    (index: number, item: T) => {
      if (typeof itemHeight === "function") {
        return itemHeight(index, item)
      }
      return itemHeight
    },
    [itemHeight]
  )

  const itemPositions = React.useMemo(() => {
    const positions: number[] = []
    let currentPos = 0

    items.forEach((item, index) => {
      positions.push(currentPos)
      currentPos += getItemHeight(index, item)
    })

    return positions
  }, [items, getItemHeight])

  const totalHeight = React.useMemo(() => {
    if (items.length === 0) return 0
    const lastItemIndex = items.length - 1
    return itemPositions[lastItemIndex] + getItemHeight(lastItemIndex, items[lastItemIndex])
  }, [items, itemPositions, getItemHeight])

  const visibleRange = React.useMemo(() => {
    if (items.length === 0) return { start: 0, end: 0 }

    let start = 0
    let end = items.length - 1

    for (let i = 0; i < items.length; i++) {
      const itemTop = itemPositions[i]
      const itemBottom = itemTop + getItemHeight(i, items[i])

      if (itemBottom < scrollTop - overscan * (typeof itemHeight === "function" ? 50 : itemHeight)) {
        start = i + 1
      }
      if (itemTop > scrollTop + containerHeight + overscan * (typeof itemHeight === "function" ? 50 : itemHeight)) {
        end = i - 1
        break
      }
    }

    return { start: Math.max(0, start), end: Math.min(items.length - 1, end) }
  }, [scrollTop, containerHeight, items.length, itemPositions, overscan, itemHeight, getItemHeight])

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  React.useEffect(() => {
    if (
      hasMore &&
      !loadingMore &&
      containerRef.current &&
      containerRef.current.scrollHeight - containerRef.current.scrollTop < containerHeight + 200
    ) {
      onLoadMore?.()
    }
  }, [scrollTop, hasMore, loadingMore, containerHeight, onLoadMore])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container || !hasMore || loadingMore) return

    const handleScrollEvent = () => {
      const { scrollHeight, scrollTop, clientHeight } = container
      if (scrollHeight - scrollTop - clientHeight < 200) {
        onLoadMore?.()
      }
    }

    container.addEventListener("scroll", handleScrollEvent)
    return () => container.removeEventListener("scroll", handleScrollEvent)
  }, [hasMore, loadingMore, onLoadMore])

  if (loading) {
    return (
      <div className={cn("overflow-hidden", className)} style={{ height: containerHeight }}>
        <div className="space-y-2 p-2">
          {Array.from({ length: Math.ceil(containerHeight / 60) }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border">
              <Skeleton className="size-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center text-center p-8", className)}
        style={{ height: containerHeight }}
      >
        <p className="text-muted-foreground font-medium">{emptyMessage}</p>
        <p className="text-sm text-muted-foreground mt-1">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="list"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => {
          const actualIndex = visibleRange.start + index
          const position = itemPositions[actualIndex]
          const height = getItemHeight(actualIndex, item)

          return (
            <div
              key={getItemKey(item, actualIndex)}
              className={cn("absolute left-0 right-0", itemClassName)}
              style={{
                top: position,
                height,
                transform: "translateZ(0)",
              }}
              role="listitem"
            >
              {renderItem(item, actualIndex)}
            </div>
          )
        })}
        {loadingMore && (
          <div
            className="absolute left-0 right-0 flex items-center justify-center py-4"
            style={{ top: totalHeight }}
          >
            <Spinner className="size-5" />
          </div>
        )}
      </div>
    </div>
  )
}

const VirtualizedList = React.memo(VirtualizedListInner) as typeof VirtualizedListInner

interface InfiniteScrollListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  onLoadMore: () => void
  hasMore: boolean
  loading?: boolean
  loadingMore?: boolean
  containerHeight?: number
  itemHeight?: number
  threshold?: number
  emptyMessage?: string
  emptyDescription?: string
  className?: string
  getItemKey: (item: T, index: number) => string | number
}

function InfiniteScrollListInner<T>({
  items,
  renderItem,
  onLoadMore,
  hasMore,
  loading = false,
  loadingMore = false,
  containerHeight = 400,
  itemHeight = 60,
  threshold = 200,
  emptyMessage = "No items",
  emptyDescription = "There are no items to display",
  className,
  getItemKey,
}: InfiniteScrollListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      setScrollTop(target.scrollTop)

      if (
        hasMore &&
        !loadingMore &&
        target.scrollHeight - target.scrollTop - target.clientHeight < threshold
      ) {
        onLoadMore()
      }
    },
    [hasMore, loadingMore, threshold, onLoadMore]
  )

  React.useEffect(() => {
    const container = containerRef.current
    if (!container || !hasMore || loadingMore) return

    const observer = new MutationObserver(() => {
      if (container.scrollHeight - container.scrollTop - container.clientHeight < threshold) {
        onLoadMore()
      }
    })

    observer.observe(container, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [hasMore, loadingMore, threshold, onLoadMore])

  if (loading) {
    return (
      <div className={cn("overflow-hidden", className)} style={{ height: containerHeight }}>
        <div className="space-y-2 p-2">
          {Array.from({ length: Math.ceil(containerHeight / itemHeight) }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border">
              <Skeleton className="size-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        className={cn("flex flex-col items-center justify-center text-center p-8", className)}
        style={{ height: containerHeight }}
      >
        <p className="text-muted-foreground font-medium">{emptyMessage}</p>
        <p className="text-sm text-muted-foreground mt-1">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="list"
    >
      {items.map((item, index) => (
        <div key={getItemKey(item, index)} role="listitem">
          {renderItem(item, index)}
        </div>
      ))}
      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <Spinner className="size-5" />
        </div>
      )}
    </div>
  )
}

const InfiniteScrollList = React.memo(InfiniteScrollListInner) as typeof InfiniteScrollListInner

export { VirtualizedList, InfiniteScrollList }
export type { VirtualizedListProps, InfiniteScrollListProps }
