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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Settings01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    Search01Icon,
    Invoice01Icon,
} from "@hugeicons/core-free-icons"
import { Empty } from "@/components/ui/empty"
import { ExportButton } from "../export-button"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/utils/format"

interface DocumentItem {
    id_document: number
    numero_document: string
    date_document: Date | string
    type_document: string
    domaine_document?: string
    montant_ttc: number
    montant_ht?: number
    statut_document: string
    nom_partenaire?: string
    partenaires?: { nom_partenaire: string }
}

interface DocumentsTableProps {
    data: DocumentItem[]
    loading?: boolean
    pageSize?: number
    showExport?: boolean
    onRowClick?: (document: DocumentItem) => void
    className?: string
}

const defaultColumns: ColumnDef<DocumentItem>[] = [
    {
        accessorKey: "numero_document",
        header: "N° Document",
        cell: ({ row }) => (
            <span className="font-medium text-primary">
                {row.getValue("numero_document")}
            </span>
        ),
    },
    {
        accessorKey: "date_document",
        header: "Date",
        cell: ({ row }) => {
            const date = row.original.date_document
            return (
                <span className="text-muted-foreground">
                    {date
                        ? new Date(date as Date | string).toLocaleDateString("fr-FR")
                        : "-"}
                </span>
            )
        },
    },
    {
        accessorKey: "partenaires",
        header: "Tiers",
        cell: ({ row }) => {
            const partner = row.original.partenaires?.nom_partenaire || row.original.nom_partenaire
            return <span className="font-medium">{partner || "-"}</span>
        },
    },
    {
        accessorKey: "type_document",
        header: "Type",
        cell: ({ row }) => (
            <Badge variant="outline" className="font-normal">
                {row.getValue("type_document")}
            </Badge>
        ),
    },
    {
        accessorKey: "montant_ttc",
        header: "Montant TTC",
        cell: ({ row }) => (
            <span className="font-semibold text-right">
                {formatPrice(row.getValue("montant_ttc") || 0)}
            </span>
        ),
    },
    {
        accessorKey: "statut_document",
        header: "Statut",
        cell: ({ row }) => {
            const status = row.getValue("statut_document") as string
            const isConfirmed = status === "FACTURE" || status === "CONFIRME"
            return (
                <Badge
                    variant={isConfirmed ? "default" : "outline"}
                    className={isConfirmed ? "bg-primary/90" : ""}
                >
                    {status}
                </Badge>
            )
        },
    },
]

export function DocumentsTable({
    data,
    loading = false,
    pageSize = 10,
    showExport = true,
    onRowClick,
    className,
}: DocumentsTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
        columns: defaultColumns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
        initialState: {
            pagination: {
                pageSize,
            },
        },
    })

    if (loading) {
        return (
            <div className={cn("space-y-4", className)}>
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-64" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>
                <div className="rounded-lg border">
                    <div className="p-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4 py-3">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-auto">
                    <HugeiconsIcon
                        icon={Search01Icon}
                        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                    />
                    <Input
                        placeholder="Rechercher un document..."
                        value={(table.getColumn("numero_document")?.getFilterValue() as string) ?? ""}
                        onChange={(e) =>
                            table.getColumn("numero_document")?.setFilterValue(e.target.value)
                        }
                        className="pl-10 w-full sm:w-64"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Column Visibility */}
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Button variant="outline" size="sm">
                                <HugeiconsIcon icon={Settings01Icon} className="size-4 mr-2" />
                                Colonnes
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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

                    {/* Export */}
                    {showExport && (
                        <ExportButton
                            data={data.map((d) => ({
                                "N° Document": d.numero_document,
                                Date: new Date(d.date_document).toLocaleDateString("fr-FR"),
                                Tiers: d.partenaires?.nom_partenaire || d.nom_partenaire || "-",
                                Type: d.type_document,
                                "Montant TTC": d.montant_ttc,
                                Statut: d.statut_document,
                            }))}
                            filename="documents"
                            formats={["csv", "xlsx"]}
                            size="sm"
                        />
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="font-semibold">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className={cn(
                                        "cursor-pointer transition-colors",
                                        onRowClick && "hover:bg-muted/50"
                                    )}
                                    onClick={() => onRowClick?.(row.original)}
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
                                <TableCell colSpan={defaultColumns.length} className="h-32">
                                    <Empty
                                        title="Aucun document trouvé"
                                        description="Les documents apparaîtront ici une fois créés."
                                        icon={Invoice01Icon}
                                    />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                    {table.getFilteredRowModel().rows.length} document(s)
                    {table.getFilteredSelectedRowModel().rows.length > 0 && (
                        <span className="ml-2">
                            ({table.getFilteredSelectedRowModel().rows.length} sélectionné(s))
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Select
                        value={String(table.getState().pagination.pageSize)}
                        onValueChange={(value) => table.setPageSize(Number(value))}
                    >
                        <SelectTrigger className="w-[100px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 20, 30, 50].map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size} / page
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground px-2">
                            Page {table.getState().pagination.pageIndex + 1} sur{" "}
                            {table.getPageCount()}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export type { DocumentItem, DocumentsTableProps }
