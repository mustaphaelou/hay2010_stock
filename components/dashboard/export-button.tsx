"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon, File01Icon, FileIcon, FilesIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

type ExportFormat = "csv" | "pdf" | "xlsx"

interface ExportButtonProps {
    data: Record<string, unknown>[]
    filename?: string
    formats?: ExportFormat[]
    onExport?: (format: ExportFormat) => void
    loading?: boolean
    disabled?: boolean
    variant?: "default" | "outline" | "ghost"
    size?: "default" | "sm" | "lg" | "icon"
    className?: string
}

// CSV Export utility
function exportToCSV(data: Record<string, unknown>[], filename: string) {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
        headers.join(","),
        ...data.map((row) =>
            headers.map((header) => {
                const value = row[header]
                // Handle values that might contain commas or quotes
                if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`
                }
                return value ?? ""
            }).join(",")
        ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
}

// PDF Export utility (simplified - uses browser print)
function exportToPDF(data: Record<string, unknown>[], filename: string) {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0])
    const tableHTML = `
    <html>
    <head>
      <title>${filename}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <h1>${filename}</h1>
      <table>
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${data.map((row) => `<tr>${headers.map((h) => `<td>${row[h] ?? ""}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
        printWindow.document.write(tableHTML)
        printWindow.document.close()
        printWindow.print()
    }
}

// Excel Export utility (creates XML-based XLS)
function exportToExcel(data: Record<string, unknown>[], filename: string) {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0])
    const xmlContent = `
    <?xml version="1.0" encoding="UTF-8"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
              xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      <Worksheet ss:Name="Data">
        <Table>
          <Row>
            ${headers.map((h) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join("")}
          </Row>
          ${data.map((row) => `
            <Row>
              ${headers.map((h) => {
        const value = row[h]
        const type = typeof value === "number" ? "Number" : "String"
        return `<Cell><Data ss:Type="${type}">${value ?? ""}</Data></Cell>`
    }).join("")}
            </Row>
          `).join("")}
        </Table>
      </Worksheet>
    </Workbook>
  `

    const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.xls`
    link.click()
    URL.revokeObjectURL(link.href)
}

const formatIcons: Record<ExportFormat, React.ReactNode> = {
    csv: <HugeiconsIcon icon={File01Icon} className="size-4" />,
    pdf: <HugeiconsIcon icon={FileIcon} className="size-4" />,
    xlsx: <HugeiconsIcon icon={FilesIcon} className="size-4" />,
}

const formatLabels: Record<ExportFormat, string> = {
    csv: "Exporter en CSV",
    pdf: "Exporter en PDF",
    xlsx: "Exporter en Excel",
}

export function ExportButton({
    data,
    filename = "export",
    formats = ["csv", "pdf", "xlsx"],
    onExport,
    loading = false,
    disabled = false,
    variant = "outline",
    size = "sm",
    className,
}: ExportButtonProps) {
    const handleExport = (format: ExportFormat) => {
        if (onExport) {
            onExport(format)
            return
        }

        switch (format) {
            case "csv":
                exportToCSV(data, filename)
                break
            case "pdf":
                exportToPDF(data, filename)
                break
            case "xlsx":
                exportToExcel(data, filename)
                break
        }
    }

    if (formats.length === 1) {
        return (
            <Button
                variant={variant}
                size={size}
                onClick={() => handleExport(formats[0])}
                disabled={disabled || loading || !data || data.length === 0}
                className={className}
            >
                <HugeiconsIcon icon={Download01Icon} className="size-4 mr-2" />
                {formatLabels[formats[0]]}
            </Button>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button
                    variant={variant}
                    size={size}
                    disabled={disabled || loading || !data || data.length === 0}
                    className={className}
                >
                    <HugeiconsIcon icon={Download01Icon} className="size-4 mr-2" />
                    Exporter
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {formats.map((format) => (
                    <DropdownMenuItem
                        key={format}
                        onClick={() => handleExport(format)}
                        className="cursor-pointer"
                    >
                        <span className="mr-2">{formatIcons[format]}</span>
                        {formatLabels[format]}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export type { ExportButtonProps, ExportFormat }
