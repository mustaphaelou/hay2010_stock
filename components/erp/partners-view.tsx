"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { fetchAllRows } from "@/lib/supabase/utils"
import { PostgrestFilterBuilder } from "@supabase/postgrest-js"
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
import {
    MoreVerticalIcon,
    InformationCircleIcon,
    ContactIcon,
    Location01Icon,
    SmartPhone01Icon,
    Mail01Icon,
    GlobalIcon,
    Cash01Icon,
    Calendar01Icon,
    Building01Icon,
    UserIcon
} from "@hugeicons/core-free-icons"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/utils/format"

const createColumns = (onViewDetails: (partner: FComptet) => void): ColumnDef<FComptet>[] => [
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
                        <DropdownMenuItem onClick={() => onViewDetails(partner)}>
                            Voir fiche
                        </DropdownMenuItem>
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
    const [selectedPartner, setSelectedPartner] = React.useState<FComptet | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)

    const handleViewDetails = (partner: FComptet) => {
        setSelectedPartner(partner)
        setIsDetailsOpen(true)
    }

    const columns = React.useMemo(() => createColumns(handleViewDetails), [])

    const supabase = React.useMemo(() => createClient(), [])

    React.useEffect(() => {
        async function fetchData() {
            try {
                const partnersQuery = supabase
                    .from("f_comptet")
                    .select("*")
                    .eq("ct_type", type)
                    .order("ct_intitule")

                const partners = await fetchAllRows<FComptet>(partnersQuery)
                setData(partners || [])
            } catch (error) {
                console.error("Error fetching partners:", error)
            }
        }

        fetchData()
    }, [type, supabase])

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

            {/* Partner Details Sheet */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent className="sm:max-w-md overflow-y-auto">
                    <SheetHeader className="pb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 uppercase">
                                {selectedPartner?.ct_num}
                            </Badge>
                            <Badge variant="secondary">
                                {type === 0 ? "Client" : "Fournisseur"}
                            </Badge>
                        </div>
                        <SheetTitle className="text-xl font-bold leading-tight">
                            {selectedPartner?.ct_intitule}
                        </SheetTitle>
                        <SheetDescription>
                            Fiche complète et informations de contact.
                        </SheetDescription>
                    </SheetHeader>

                    <Separator />

                    <div className="grid gap-6 py-6 px-1">
                        {/* Section: Informations Générales */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4" />
                                Identification
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">N° Compte</p>
                                    <p className="font-medium">{selectedPartner?.ct_num}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Qualité</p>
                                    <p className="font-medium">{selectedPartner?.ct_qualite || "-"}</p>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Intitulé</p>
                                    <p className="font-medium">{selectedPartner?.ct_intitule}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Identifiant / ICE</p>
                                    <p className="font-medium">{selectedPartner?.ct_identifiant || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">SIRET / RC</p>
                                    <p className="font-medium">{selectedPartner?.ct_siret || "-"}</p>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-muted/50" />

                        {/* Section: Contact & Communication */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={ContactIcon} className="h-4 w-4" />
                                Contact & Communication
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="bg-muted p-2 rounded-full">
                                        <HugeiconsIcon icon={UserIcon} className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase">Interlocuteur</p>
                                        <p className="font-medium">{selectedPartner?.ct_contact || "Non renseigné"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-muted p-2 rounded-full">
                                        <HugeiconsIcon icon={SmartPhone01Icon} className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase">Téléphone</p>
                                        <p className="font-medium">{selectedPartner?.ct_telephone || "Non renseigné"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-muted p-2 rounded-full">
                                        <HugeiconsIcon icon={Mail01Icon} className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase">Email</p>
                                        {selectedPartner?.ct_email ? (
                                            <a href={`mailto:${selectedPartner.ct_email}`} className="font-medium text-primary hover:underline">
                                                {selectedPartner.ct_email}
                                            </a>
                                        ) : (
                                            <p className="font-medium">Non renseigné</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-muted p-2 rounded-full">
                                        <HugeiconsIcon icon={GlobalIcon} className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase">Site Web</p>
                                        {selectedPartner?.ct_site ? (
                                            <a href={selectedPartner.ct_site.startsWith('http') ? selectedPartner.ct_site : `https://${selectedPartner.ct_site}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                                {selectedPartner.ct_site}
                                            </a>
                                        ) : (
                                            <p className="font-medium">Non renseigné</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-muted/50" />

                        {/* Section: Localisation */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={Location01Icon} className="h-4 w-4" />
                                Localisation
                            </h3>
                            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                                <div className="flex items-start gap-2">
                                    <HugeiconsIcon icon={Building01Icon} className="h-4 w-4 mt-1 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">{selectedPartner?.ct_adresse || "Pas d'adresse"}</p>
                                        {selectedPartner?.ct_complement && <p className="text-sm text-muted-foreground">{selectedPartner.ct_complement}</p>}
                                        <p className="text-sm">
                                            {selectedPartner?.ct_codepostal} {selectedPartner?.ct_ville}
                                        </p>
                                        <p className="text-xs font-semibold uppercase mt-1">{selectedPartner?.ct_pays || "Maroc"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-muted/50" />

                        {/* Section: Comptabilité / Conditions */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={Cash01Icon} className="h-4 w-4" />
                                Conditions & Comptabilité
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Encours Actuel</p>
                                    <p className="font-bold text-primary">{selectedPartner?.ct_encours ? `${selectedPartner.ct_encours} Dhs` : "0.00 Dhs"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Encours Max</p>
                                    <p className="font-medium">{selectedPartner?.ct_encours_max ? `${selectedPartner.ct_encours_max} Dhs` : "Non défini"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Compte Collectif</p>
                                    <p className="font-mono text-xs">{selectedPartner?.ct_compte_collectif || "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase">Taux Remise</p>
                                    <Badge variant="outline">{selectedPartner?.ct_taux_remise || 0} %</Badge>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-muted/50" />

                        {/* Section: Audit */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
                                <HugeiconsIcon icon={Calendar01Icon} className="h-4 w-4" />
                                Historique
                            </h3>
                            <div className="space-y-3 bg-muted/20 p-3 rounded-md text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Créé le</span>
                                    <span className="font-medium">{selectedPartner?.ct_date_create ? formatDate(selectedPartner.ct_date_create) : "-"}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Dernière modification</span>
                                    <span className="font-medium">{selectedPartner?.ct_date_modif ? formatDate(selectedPartner.ct_date_modif) : "-"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
