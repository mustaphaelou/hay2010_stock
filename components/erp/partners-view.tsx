"use client"

import * as React from "react"
import { getPartners } from "@/app/actions/partners"
import dynamic from "next/dynamic"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
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
  UserGroupIcon
} from "@hugeicons/core-free-icons"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/utils"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"

type Partner = Awaited<ReturnType<typeof getPartners>>['data'][0]

const createColumns = (onViewDetails: (partner: Partner) => void): ColumnDef<Partner>[] => [
    {
        accessorKey: "code_partenaire",
        header: "Compte",
        cell: ({ row }) => <div className="font-medium text-primary">{row.getValue("code_partenaire")}</div>,
    },
    {
        accessorKey: "nom_partenaire",
        header: "Intitulé",
    },
    {
        accessorKey: "ville",
        header: "Ville",
    },
    {
        accessorKey: "numero_telephone",
        header: "Téléphone",
        cell: ({ row }) => row.getValue("numero_telephone") || "-",
    },
    {
        accessorKey: "adresse_email",
        header: "Email",
        cell: ({ row }) => row.getValue("adresse_email") || "-",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const partner = row.original
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground size-8 p-0">
                        <span className="sr-only">Menu</span>
                        <HugeiconsIcon icon={MoreVerticalIcon}  />
                    </DropdownMenuTrigger>
<DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(partner.code_partenaire)}>
            Copier N° Compte
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onViewDetails(partner)}>
            Voir fiche
          </DropdownMenuItem>
          <DropdownMenuItem>Voir historique</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]

const DataTable = dynamic(() => import("@/components/erp/data-table").then(m => ({ default: m.DataTable })), {
  ssr: true,
  loading: () => <div className="h-64 animate-pulse bg-muted rounded-md" />,
})

interface PartnersViewProps {
    type: 0 | 1 // 0=Client, 1=Supplier
    title: string
}

function PartnersView({ type, title }: PartnersViewProps) {
  const [data, setData] = React.useState<Partner[]>([])
  const [selectedPartner, setSelectedPartner] = React.useState<Partner | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)

  const handleViewDetails = React.useCallback((partner: Partner) => {
    setSelectedPartner(partner)
    setIsDetailsOpen(true)
  }, [])

  const columns = React.useMemo(() => createColumns(handleViewDetails), [handleViewDetails])

  React.useEffect(() => {
    async function fetchData() {
      try {
        const partnerType = type === 0 ? 'CLIENT' : 'FOURNISSEUR'
        const result = await getPartners(partnerType)
        setData(result.data || [])
      } catch (error) {
        console.error("Error fetching partners:", error)
      }
    }

    fetchData()
  }, [type])

    return (
        <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in-up">
            {/* Responsive header - Stacked with more impact */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight gradient-text">{title}</h2>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="flex size-2 rounded-full bg-primary" />
                        {data.length} {type === 0 ? "clients" : "fournisseurs"} référencés au total
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button size="lg" className="w-full sm:w-auto hover-lift shadow-md rounded-xl font-bold">
                        <span className="mr-2 text-xl">+</span> Nouveau {type === 0 ? "Client" : "Fournisseur"}
                    </Button>
                </div>
            </div>

            {/* Table card - Premium implementation */}
            <Card className="overflow-hidden border-muted/40 shadow-sm transition-all hover:shadow-md">
                <CardHeader className="pb-4 bg-muted/20 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <HugeiconsIcon icon={UserGroupIcon} className="text-primary" />
                                Liste des Tiers
                            </CardTitle>
                            <CardDescription>Consultez et gérez vos partenaires commerciaux.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-2">
                    <DataTable
                        columns={columns}
                        data={data}
                        searchKey="nom_partenaire"
                        placeholder="Rechercher par nom ou intitulé..."
                    />
                </CardContent>
            </Card>

            {/* Partner Details Sheet */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6">
                    <SheetHeader className="pb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 uppercase">
                                {selectedPartner?.code_partenaire}
                            </Badge>
                            <Badge variant="secondary">
                                {type === 0 ? "Client" : "Fournisseur"}
                            </Badge>
                        </div>
                        <SheetTitle className="text-xl font-bold leading-tight">
                            {selectedPartner?.nom_partenaire}
                        </SheetTitle>
                        <SheetDescription>
                            Fiche complète et informations de contact.
                        </SheetDescription>
                    </SheetHeader>

                    <Separator />

                    <div className="grid gap-5 py-4 sm:py-6 px-0 sm:px-1">
                        {/* Section: Informations Générales */}
<div className="flex flex-col gap-4">
<h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
<HugeiconsIcon icon={InformationCircleIcon} />
Identification
</h3>
<div className="grid grid-cols-2 gap-4">
<div className="flex flex-col gap-1">
<p className="text-xs text-muted-foreground uppercase">N° Compte</p>
<p className="font-medium">{selectedPartner?.code_partenaire}</p>
</div>
<div className="flex flex-col gap-1">
<p className="text-xs text-muted-foreground uppercase">Type</p>
<p className="font-medium">{selectedPartner?.type_partenaire}</p>
</div>
<div className="col-span-2 flex flex-col gap-1">
<p className="text-xs text-muted-foreground uppercase">Intitulé</p>
<p className="font-medium">{selectedPartner?.nom_partenaire}</p>
</div>
<div className="flex flex-col gap-1">
<p className="text-xs text-muted-foreground uppercase">Identifiant / ICE</p>
<p className="font-medium">{selectedPartner?.numero_ice || "-"}</p>
</div>
<div className="flex flex-col gap-1">
<p className="text-xs text-muted-foreground uppercase">TVA</p>
<p className="font-medium">{selectedPartner?.numero_tva || "-"}</p>
</div>
</div>
                        </div>

                        <Separator className="bg-muted/50" />

                        {/* Section: Contact & Communication */}
<div className="flex flex-col gap-4">
<h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
<HugeiconsIcon icon={ContactIcon} />
Contact & Communication
</h3>
<div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="bg-muted p-2 rounded-full">
              <HugeiconsIcon icon={SmartPhone01Icon} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Téléphone</p>
                <p className="font-medium">{selectedPartner?.numero_telephone || "Non renseigné"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-muted p-2 rounded-full">
                <HugeiconsIcon icon={Mail01Icon} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Email</p>
                {selectedPartner?.adresse_email ? (
                  <a href={`mailto:${selectedPartner.adresse_email}`} className="font-medium text-primary hover:underline">
                    {selectedPartner.adresse_email}
                  </a>
                ) : (
                  <p className="font-medium">Non renseigné</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-muted p-2 rounded-full">
                <HugeiconsIcon icon={GlobalIcon} className="text-muted-foreground" />
              </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase">Site Web</p>
                                        {selectedPartner?.url_site_web ? (
                                            <a href={selectedPartner.url_site_web.startsWith('http') ? selectedPartner.url_site_web : `https://${selectedPartner.url_site_web}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                                {selectedPartner.url_site_web}
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
<div className="flex flex-col gap-4">
<h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
<HugeiconsIcon icon={Location01Icon} />
Localisation
</h3>
<div className="bg-muted/30 p-4 rounded-lg flex flex-col gap-2">
                                <div className="flex items-start gap-2">
                                    <HugeiconsIcon icon={Building01Icon} className="size-4 mt-1 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">{selectedPartner?.adresse_rue || "Pas d'adresse"}</p>
                                        <p className="text-sm">
                                            {selectedPartner?.code_postal} {selectedPartner?.ville}
                                        </p>
                                        <p className="text-xs font-semibold uppercase mt-1">{selectedPartner?.pays || "Maroc"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-muted/50" />

                        {/* Section: Comptabilité / Conditions */}
<div className="flex flex-col gap-4">
<h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
<HugeiconsIcon icon={Cash01Icon} />
Conditions & Comptabilité
</h3>
<div className="grid grid-cols-2 gap-4">
<div className="flex flex-col gap-1">
<p className="text-xs text-muted-foreground uppercase">Encours Actuel</p>
<p className="font-bold text-primary">{selectedPartner?.solde_courant ? `${selectedPartner.solde_courant} Dhs` : "0.00 Dhs"}</p>
</div>
<div className="flex flex-col gap-1">
<p className="text-xs text-muted-foreground uppercase">Encours Max</p>
<p className="font-medium">{selectedPartner?.plafond_credit ? `${selectedPartner.plafond_credit} Dhs` : "Non défini"}</p>
</div>
<div className="flex flex-col gap-1">
<p className="text-xs text-muted-foreground uppercase">Compte Collectif</p>
<p className="font-mono text-xs">{selectedPartner?.compte_collectif || "-"}</p>
</div>
<div className="flex flex-col gap-1">
<p className="text-xs text-muted-foreground uppercase">Taux Remise</p>
<Badge variant="outline">{selectedPartner?.pourcentage_remise?.toString() || 0} %</Badge>
</div>
</div>
					</div>

					<Separator className="bg-muted/50" />

                        {/* Section: Audit */}
<div className="flex flex-col gap-4">
<h3 className="text-sm font-semibold flex items-center gap-2 text-foreground/70 uppercase tracking-wider">
<HugeiconsIcon icon={Calendar01Icon} />
Historique
</h3>
<div className="flex flex-col gap-3 bg-muted/20 p-3 rounded-md text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Créé le</span>
                                    <span className="font-medium">{selectedPartner?.date_creation ? formatDate(selectedPartner.date_creation.toISOString()) : "-"}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Dernière modification</span>
                                    <span className="font-medium">{selectedPartner?.date_modification ? formatDate(selectedPartner.date_modification.toISOString()) : "-"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </SheetContent>
      </Sheet>
    </div>
  )
}

export default React.memo(PartnersView)
