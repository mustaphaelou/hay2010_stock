"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Download02Icon,
  FilterHorizontalIcon,
  Settings04Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BackwardIcon,
  ForwardIcon,
  GridViewIcon,
  ListViewIcon,
} from "@hugeicons/core-free-icons"

interface EnhancedDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  pageSize?: number
  pageSizeOptions?: number[]
  enableSorting?: boolean
  enableFiltering?: boolean
  enablePagination?: boolean
  enableRowSelection?: boolean
  enableColumnVisibility?: boolean
  enableExport?: boolean
  loading?: boolean
  mobileCardRender?: (item: TData) => React.ReactNode
  className?: string
  onRowClick?: (row: TData) => void
  onExport?: (format: "csv" | "excel") => void
  emptyMessage?: string
  emptyDescription?: string
}

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function MobileCardSkeleton() {
  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  )
}

export function EnhancedDataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  pageSize = 10,
  pageSizeOptions = [10, 20, 30, 50],
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableRowSelection = false,
  enableColumnVisibility = true,
  enableExport = false,
  loading = false,
  mobileCardRender,
  className,
  onRowClick,
  onExport,
  emptyMessage = "No results found",
  emptyDescription = "Try adjusting your search or filter.",
}: EnhancedDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [viewMode, setViewMode] = React.useState<"table" | "card">("table")
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  })

  const handleExport = (format: "csv" | "excel") => {
    if (onExport) {
      onExport(format)
      return
    }

    const headers = columns
      .map((col) => (col as ColumnDef<TData, TValue> & { accessorKey?: string }).accessorKey)
      .filter(Boolean)
    
    const rows = table.getFilteredRowModel().rows.map((row) => {
      return headers.map((key) => (row.original as Record<string, unknown>)[key as string] ?? "")
    })

    if (format === "csv") {
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n")
      
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "export.csv"
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768
  const showCardView = isMobile && mobileCardRender

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {enableFiltering && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
        )}
        <div className="rounded-md border">
          {showCardView ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <MobileCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((_, index) => (
                    <TableHead key={index}>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableSkeleton columns={columns.length} />
              </TableBody>
            </Table>
          )}
        </div>
        {enablePagination && (
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        )}
      </div>
    )
  }

  const selectedRows = table.getFilteredSelectedRowModel().rows.length

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {enableFiltering && searchKey && (
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="pr-8"
              />
            </div>
          )}
          {enableFiltering && !searchKey && (
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="max-w-sm"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedRows > 0 && (
            <Badge variant="secondary" className="gap-1">
              {selectedRows} selected
            </Badge>
          )}

{enableColumnVisibility && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm" className="gap-2">
                <HugeiconsIcon icon={Settings04Icon} strokeWidth={2} className="size-4" />
                <span className="hidden sm:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {enableExport && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm" className="gap-2">
                <HugeiconsIcon icon={Download02Icon} strokeWidth={2} className="size-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={false}
                onCheckedChange={() => handleExport("csv")}
              >
                Export as CSV
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={false}
                onCheckedChange={() => handleExport("excel")}
              >
                Export as Excel
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

          {showCardView && (
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="xs"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
              >
                <HugeiconsIcon icon={ListViewIcon} strokeWidth={2} className="size-4" />
              </Button>
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="xs"
                onClick={() => setViewMode("card")}
                aria-label="Card view"
              >
                <HugeiconsIcon icon={GridViewIcon} strokeWidth={2} className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        {showCardView && viewMode === "card" ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <div
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "rounded-lg border bg-card p-4 transition-all",
                    onRowClick && "cursor-pointer hover:shadow-md hover:border-primary/50"
                  )}
                >
                  {mobileCardRender(row.original)}
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                <p>{emptyMessage}</p>
                <p className="text-sm mt-1">{emptyDescription}</p>
              </div>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()

                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          enableSorting && canSort && "cursor-pointer select-none hover:bg-muted/50"
                        )}
                        onClick={enableSorting && canSort ? header.column.getToggleSortingHandler() : undefined}
                        aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}
                      >
                        <div className="flex items-center gap-2">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {enableSorting && canSort && (
                            <span className="shrink-0">
                              {sorted === "asc" ? (
                                <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} className="size-4" />
                              ) : sorted === "desc" ? (
                                <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-4" />
                              ) : (
                                <HugeiconsIcon icon={FilterHorizontalIcon} strokeWidth={2} className="size-4 opacity-50" />
                              )}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground font-medium">{emptyMessage}</p>
                      <p className="text-sm text-muted-foreground">{emptyDescription}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {enablePagination && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {enableRowSelection && (
              <span>
                {selectedRows} of {table.getFilteredRowModel().rows.length} row(s) selected
              </span>
            )}
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                aria-label="First page"
              >
                <HugeiconsIcon icon={BackwardIcon} strokeWidth={2} className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                aria-label="Last page"
              >
                <HugeiconsIcon icon={ForwardIcon} strokeWidth={2} className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export type { EnhancedDataTableProps }
