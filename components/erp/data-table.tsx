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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { HugeiconsIcon } from "@hugeicons/react"
import { Settings01Icon, ArrowLeft01Icon, ArrowRight01Icon, Menu01Icon, GridIcon } from "@hugeicons/core-free-icons"
import { useIsMobile } from "@/hooks/use-mobile"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    searchKey?: string
    placeholder?: string
    loading?: boolean
    pageSize?: number
    /** Optional render function for mobile card view. If provided, a toggle will appear on mobile. */
    mobileCardRenderer?: (row: TData, index: number) => React.ReactNode
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    placeholder = "Filtrer…",
    loading = false,
    pageSize: initialPageSize = 10,
    mobileCardRenderer,
}: DataTableProps<TData, TValue>) {
    const isMobile = useIsMobile()
    const [viewMode, setViewMode] = React.useState<"table" | "cards">("table")
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: initialPageSize,
    })

    // Auto-switch to cards on mobile if renderer is provided
    React.useEffect(() => {
        if (isMobile && mobileCardRenderer) {
            setViewMode("cards")
        } else if (!isMobile) {
            setViewMode("table")
        }
    }, [isMobile, mobileCardRenderer])


    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: setPagination,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination,
        },
    })

    const currentPage = table.getState().pagination.pageIndex + 1
    const totalPages = table.getPageCount()
    const totalRows = table.getFilteredRowModel().rows.length
    const startRow = pagination.pageIndex * pagination.pageSize + 1
    const endRow = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows)

    return (
        <div className="space-y-4">
            {/* Mobile-first responsive toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search input - full width on mobile */}
                <div className="w-full sm:w-auto sm:flex-1 sm:max-w-sm">
                    {searchKey && (
                        <Input
                            placeholder={placeholder}
                            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                                table.getColumn(searchKey)?.setFilterValue(event.target.value)
                            }
                            className="w-full h-11 sm:h-9 text-base sm:text-sm"
                            autoComplete="off"
                            aria-label="Rechercher dans le tableau"
                        />
                    )}
                </div>
                {/* Controls - horizontal scroll on mobile if needed */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 sm:overflow-visible">
                    {/* View mode toggle - only on mobile when card renderer is available */}
                    {mobileCardRenderer && isMobile && (
                        <div className="flex items-center border rounded-lg flex-shrink-0">
                            <Button
                                variant={viewMode === "table" ? "secondary" : "ghost"}
                                size="icon"
                                className="h-11 w-11 rounded-r-none"
                                onClick={() => setViewMode("table")}
                                aria-label="Vue tableau"
                                aria-pressed={viewMode === "table"}
                            >
                                <HugeiconsIcon icon={Menu01Icon} className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                                variant={viewMode === "cards" ? "secondary" : "ghost"}
                                size="icon"
                                className="h-11 w-11 rounded-l-none border-l"
                                onClick={() => setViewMode("cards")}
                                aria-label="Vue cartes"
                                aria-pressed={viewMode === "cards"}
                            >
                                <HugeiconsIcon icon={GridIcon} className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </div>
                    )}
                    <Select
                        value={pagination.pageSize.toString()}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value))
                        }}
                    >
                        <SelectTrigger className="w-[110px] sm:w-[130px] h-11 sm:h-9 flex-shrink-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10 lignes</SelectItem>
                            <SelectItem value="25">25 lignes</SelectItem>
                            <SelectItem value="50">50 lignes</SelectItem>
                            <SelectItem value="100">100 lignes</SelectItem>
                        </SelectContent>
                    </Select>
                    {/* Column visibility - icon only on mobile */}
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-11 sm:h-9 px-3 sm:px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex-shrink-0"
                            aria-label="Afficher ou masquer les colonnes"
                        >
                            <HugeiconsIcon icon={Settings01Icon} className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Colonnes</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {/* Content: Table or Cards view */}
            {viewMode === "cards" && mobileCardRenderer ? (
                /* Mobile Card View */
                <div className="space-y-3">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={`card-skeleton-${i}`} className="rounded-lg border bg-card p-4 animate-pulse">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-muted rounded w-1/3" />
                                        <div className="h-5 bg-muted rounded w-2/3" />
                                    </div>
                                    <div className="h-8 w-8 bg-muted rounded" />
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                    <div className="space-y-1">
                                        <div className="h-3 bg-muted rounded w-1/2" />
                                        <div className="h-4 bg-muted rounded w-3/4" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="h-3 bg-muted rounded w-1/2" />
                                        <div className="h-4 bg-muted rounded w-3/4" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row, index) =>
                            mobileCardRenderer(row.original, index)
                        )
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            Aucun résultat.
                        </div>
                    )}
                </div>
            ) : (
                /* Table View */
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                // Loading skeleton
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={`skeleton-${i}`}>
                                        {columns.map((_, j) => (
                                            <TableCell key={`skeleton-cell-${i}-${j}`}>
                                                <Skeleton className="h-5 w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className="hover:bg-muted/50 transition-colors"
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
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        Aucun résultat.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
            {/* Responsive pagination */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Results count - centered on mobile */}
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                    {totalRows > 0 ? (
                        <>
                            <span className="hidden sm:inline">Affichage de </span>
                            <span className="font-medium">{startRow}</span>
                            <span className="sm:hidden">-</span>
                            <span className="hidden sm:inline"> à </span>
                            <span className="font-medium">{endRow}</span>
                            <span className="hidden sm:inline"> sur </span>
                            <span className="sm:hidden"> / </span>
                            <span className="font-medium">{totalRows}</span>
                            <span className="hidden sm:inline"> résultat(s)</span>
                        </>
                    ) : (
                        "Aucun résultat"
                    )}
                </div>
                {/* Pagination controls - larger on mobile for touch */}
                <div className="flex items-center justify-center sm:justify-end gap-2 sm:space-x-2">
                    <span className="text-sm text-muted-foreground">
                        <span className="hidden sm:inline">Page </span>{currentPage}<span className="sm:hidden">/</span><span className="hidden sm:inline"> sur </span>{totalPages || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 sm:h-8 sm:w-8 p-0"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        aria-label="Page précédente"
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 sm:h-8 sm:w-8 p-0"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        aria-label="Page suivante"
                    >
                        <HugeiconsIcon icon={ArrowRight01Icon} className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
