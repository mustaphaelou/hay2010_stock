"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb"
import { DateRangePicker, type DateRangePickerProps } from "@/components/ui/date-range-picker"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  RefreshIcon,
  Download02Icon,
  Settings01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface DashboardHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  showSearch?: boolean
  showDateRange?: boolean
  showRefresh?: boolean
  showExport?: boolean
  showSettings?: boolean
  onRefresh?: () => void
  onExport?: () => void
  onSettings?: () => void
  onSearch?: () => void
  dateRange?: DateRangePickerProps["date"]
  onDateRangeChange?: DateRangePickerProps["onDateChange"]
  isLoading?: boolean
  className?: string
  children?: React.ReactNode
}

export function DashboardHeader({
  title,
  description,
  breadcrumbs = [],
  showSearch = true,
  showDateRange = true,
  showRefresh = true,
  showExport = true,
  showSettings = true,
  onRefresh,
  onExport,
  onSettings,
  onSearch,
  dateRange,
  onDateRangeChange,
  isLoading = false,
  className,
  children,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:gap-6",
        className
      )}
      role="banner"
    >
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <Breadcrumb aria-label="Dashboard navigation">
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Title and Actions Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1
            className={cn(
              "text-2xl sm:text-3xl font-bold tracking-tight",
              "bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text",
              "dark:from-foreground dark:to-foreground/50"
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {showSearch && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSearch}
              className="gap-2"
              aria-label="Open search"
            >
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={2}
                className="size-4"
              />
              <span className="hidden sm:inline">Search</span>
            </Button>
          )}

          {showDateRange && (
            <DateRangePicker
              date={dateRange}
              onDateChange={onDateRangeChange}
              className="w-auto"
            />
          )}

          {showRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="gap-2"
              aria-label="Refresh data"
            >
              <HugeiconsIcon
                icon={RefreshIcon}
                strokeWidth={2}
                className={cn("size-4", isLoading && "animate-spin")}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}

          {showExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-2"
              aria-label="Export data"
            >
              <HugeiconsIcon
                icon={Download02Icon}
                strokeWidth={2}
                className="size-4"
              />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}

          {showSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSettings}
              className="gap-2"
              aria-label="Open settings"
            >
              <HugeiconsIcon
                icon={Settings01Icon}
                strokeWidth={2}
                className="size-4"
              />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          )}

          {children}
        </div>
      </div>
    </header>
  )
}

export type { DashboardHeaderProps, BreadcrumbItem as BreadcrumbItemType }
