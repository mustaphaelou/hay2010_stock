"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { FComptet } from "@/lib/supabase/types"
import { DataTable } from "@/components/erp/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreVerticalIcon } from "@hugeicons/core-free-icons"

const columns: ColumnDef<FComptet>[] = [
    {
        accessorKey: "ct_num",
        header: "Compte",
        cell: ({ row }) => <div className="font-medium text-primary">{row.getValue("ct_num")}</div>,
    },
    {
        accessorKey: "ct_intitule",
        header: "Intitulé",
    },
    {
        accessorKey: "ct_ville",
        header: "Ville",
    },
    {
        accessorKey: "ct_contact",
        header: "Contact",
        cell: ({ row }) => row.getValue("ct_contact") || "-",
    },
    {
        accessorKey: "ct_telephone",
        header: "Téléphone",
        cell: ({ row }) => row.getValue("ct_telephone") || "-",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const partner = row.original
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                        <span className="sr-only">Menu</span>
                        <HugeiconsIcon icon={MoreVerticalIcon} className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(partner.ct_num)}>
                            Copier N° Compte
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Voir fiche</DropdownMenuItem>
                        <DropdownMenuItem>Voir historique</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]

interface PartnersViewProps {
    type: 0 | 1 // 0=Client, 1=Supplier
    title: string
}

export function PartnersView({ type, title }: PartnersViewProps) {
    const [data, setData] = React.useState<FComptet[]>([])
    const [loading, setLoading] = React.useState(true)
    const supabase = createClient()

    React.useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                const { data: partners, error } = await supabase
                    .from("f_comptet")
                    .select("*")
                    .eq("ct_type", type)
                    .order("ct_intitule")

                if (error) throw error
                setData(partners as any[])
            } catch (error) {
                console.error("Error fetching partners:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [type])

    return (
        <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground">
                        {data.length} {type === 0 ? "clients" : "fournisseurs"} référencés
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button>
                        Nouveau {type === 0 ? "Client" : "Fournisseur"}
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-card text-card-foreground shadow-sm p-1">
                <DataTable
                    columns={columns}
                    data={data}
                    searchKey="ct_intitule"
                    placeholder="Rechercher par nom..."
                />
            </div>
        </div>
    )
}
