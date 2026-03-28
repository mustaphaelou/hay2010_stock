export { InteractiveChartCard } from "./interactive-chart-card"
export type {
  ChartType,
  TimeRange,
  DataPoint,
  SeriesConfig,
  InteractiveChartCardProps,
} from "./interactive-chart-card"

export { StatsOverviewCard } from "./stats-overview-card"
export type { StatsOverviewCardProps, TrendData } from "./stats-overview-card"

export { RealtimeMetricsGrid } from "./realtime-metrics-grid"
export type { MetricConfig, RealtimeMetricsGridProps } from "./realtime-metrics-grid"

export { DashboardHeader } from "./dashboard-header"
export type { DashboardHeaderProps, BreadcrumbItemType } from "./dashboard-header"

export { RecentActivityFeed } from "./recent-activity-feed"
export type { RecentActivityFeedProps, ActivityItem } from "./recent-activity-feed"

export { PerformanceGauge } from "./performance-gauge"
export type { PerformanceGaugeProps, Threshold } from "./performance-gauge"

export { EnhancedDashboardView } from "./enhanced-dashboard-view"
export type { EnhancedDashboardViewProps, ChartData, ActivityData, GaugeData } from "./enhanced-dashboard-view"

export { ThemeCustomizer } from "./theme-customizer"
export type { ThemeCustomizerProps, ThemePreset } from "./theme-customizer"

export {
  KeyboardShortcuts,
  KeyboardShortcutsProvider,
  KeyboardShortcutsButton,
  useKeyboardShortcuts,
} from "./keyboard-shortcuts"
export type { ShortcutConfig, KeyboardShortcutsProps } from "./keyboard-shortcuts"

export { EnhancedDataTable } from "./enhanced-data-table"
export type { EnhancedDataTableProps } from "./enhanced-data-table"

export {
  LazyLoad,
  LazyInteractiveChartCard,
  LazyPerformanceGauge,
  LazyEnhancedDataTable,
  ChartLoadingFallback,
  GaugeLoadingFallback,
  TableLoadingFallback,
  ErrorBoundary,
} from "./lazy-components"
export type { LazyLoadProps } from "./lazy-components"

export { VirtualizedList, InfiniteScrollList } from "./virtualized-list"
export type { VirtualizedListProps, InfiniteScrollListProps } from "./virtualized-list"

export {
  DashboardProvider,
  useDashboard,
  useDashboardFilters,
  useDashboardViewMode,
  useDashboardRefresh,
  useRealtimeUpdates,
  usePerformanceTracking,
} from "./dashboard-context"
export type {
  DashboardContextValue,
  DashboardState,
  DashboardFilters,
  ViewMode,
  DateRange,
} from "./dashboard-context"

export {
  useSWRLike,
  useDashboardStats,
  useChartData,
  useRecentActivity,
  useOptimisticUpdate,
} from "./use-dashboard-data"
export type {
  DashboardStats,
  ChartDataPoint,
  ActivityItem as DashboardActivityItem,
  FetchState,
  FetchOptions,
} from "./use-dashboard-data"
