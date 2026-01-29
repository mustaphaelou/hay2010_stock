"use client"

import * as React from "react"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { Partenaire, Produit } from "@/lib/supabase/types"
import { formatPrice, formatDate } from "@/lib/utils/format"
import {
  type ColumnDef,
} from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { z } from "zod"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  LayersIcon,
  Settings01Icon,
  MoreVerticalIcon,
  Logout01Icon,
  ChartUpIcon,
  ChartDownIcon,
  UserCircleIcon,
  CreditCardIcon,
  Notification01Icon,
  PackageIcon,
  UserGroupIcon,
  DocumentValidationIcon,
  Invoice01Icon,
  Store01Icon,
  Analytics01Icon,
  DashboardSquare01Icon,
  ShoppingBag01Icon,
  TruckDeliveryIcon,
  Calculator01Icon,
  File01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon
} from "@hugeicons/core-free-icons"
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, YAxis, Legend, ResponsiveContainer } from "recharts"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

// Hoisted static constants
const CHART_CONFIG = {
  revenue: {
    label: "CA Mensuel",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const STATS_CONFIG = {
  amount: {
    label: "Chiffre d'Affaires",
    color: "hsl(var(--primary))",
  },
  value: {
    label: "Valeur",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Types for data
type EnhancedProduit = Produit & { categories_produits: { nom_categorie: string } }

const StatsArticlesView = React.memo(function StatsArticlesView({ products }: { products: EnhancedProduit[] }) {
  // Derive stats from real data
  const totalArticles = products.length

  // Group by family for the pie chart
  const familiesData = useMemo(() => {
    return products.reduce((acc, p) => {
      const family = p.categories_produits?.nom_categorie || 'Autre'
      acc[family] = (acc[family] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [products])

  const salesByFamily = useMemo(() =>
    Object.entries(familiesData).map(([name, value]) => ({ name, value })),
    [familiesData]
  )

  // Top sales calculation
  const topProducts = useMemo(() => products
    .sort((a, b) => (b.prix_vente ?? 0) - (a.prix_vente ?? 0))
    .slice(0, 5)
    .map(p => ({ name: p.nom_produit, amount: p.prix_vente ?? 0 })),
    [products]
  )

  return (
    <div className="flex flex-1 flex-col gap-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Statistiques Articles</h2>
          <p className="text-muted-foreground">Analyse du catalogue articles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <Card variant="kpi">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <div className="icon-container">
              <HugeiconsIcon icon={PackageIcon} strokeWidth={2} className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{totalArticles}</div>
            <p className="text-xs text-muted-foreground">Articles actifs en base</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="premium">
          <CardHeader>
            <CardTitle>Top 5 Articles (Par Prix de Vente)</CardTitle>
            <CardDescription>Visualisation basée sur les prix catalogue.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={STATS_CONFIG} className="h-[300px] w-full">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 40, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <ChartTooltip cursor={{ fill: 'transparent' }} content={<ChartTooltipContent />} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader>
            <CardTitle>Répartition par Famille</CardTitle>
            <CardDescription>Nombre d'articles par famille de produits.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={STATS_CONFIG} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={salesByFamily}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {salesByFamily.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})


const StockMovementsView = React.memo(function StockMovementsView({ movements = [] }: { movements?: any[] }) {
  return (
    <div className="flex flex-1 flex-col gap-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mouvements de Stock</h2>
          <p className="text-muted-foreground">Historique des entrées et sorties de marchandises.</p>
        </div>
      </div>

      <Card variant="premium">
        <CardHeader>
          <CardTitle>Journal des Mouvements</CardTitle>
          <CardDescription>Liste chronologique des opérations de stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="table-zebra">
            <TableHeader className="table-sticky-header">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Document</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Aucun mouvement enregistré
                  </TableCell>
                </TableRow>
              ) : movements.map((movement: any) => (
                <TableRow key={movement.id} className="table-row-virtualized hover:bg-muted/50 transition-colors">
                  <TableCell>{movement.date}</TableCell>
                  <TableCell className="font-medium">{movement.ref}</TableCell>
                  <TableCell>{movement.designation}</TableCell>
                  <TableCell>
                    <Badge variant={movement.type === "Entrée" ? "default" : "secondary"}>
                      {movement.type === "Entrée" ? <HugeiconsIcon icon={ArrowRight01Icon} className="mr-1 h-3 w-3" /> : <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-1 h-3 w-3" />}
                      {movement.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{movement.document}</TableCell>
                  <TableCell className={`text-right font-bold ${movement.quantity > 0 ? "trend-up" : "trend-down"}`}>
                    {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
})

export default function Dashboard01Block() {
  const [currentView, setCurrentView] = useState<"dashboard" | "stats-articles" | "stock-movements">("dashboard")
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [selectedFamily, setSelectedFamily] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const [products, setProducts] = useState<EnhancedProduit[]>([])
  const [partners, setPartners] = useState<Partenaire[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // OPTIMIZATION: Parallel queries with Promise.all (4× faster than sequential)
        // Reference: async-parallel best practice
        const [productsRes, partnersRes, docsRes, movementsRes] = await Promise.all([
          supabase
            .from('produits')
            .select('*, categories_produits(nom_categorie)')
            .order('nom_produit'),
          supabase
            .from('partenaires')
            .select('*'),
          supabase
            .from('documents')
            .select('*, partenaires(nom_partenaire)')
            .order('date_document', { ascending: false }),
          supabase
            .from('lignes_documents')
            .select(`
              id_ligne,
              quantite_livree,
              produits (nom_produit, code_produit),
              documents (numero_document, date_document, type_document)
            `)
            .order('id_ligne', { ascending: false })
            .limit(20)
        ])

        // Transform movements for the view
        const formattedMovements = movementsRes.data?.map((m: any) => ({
          id: m.id_ligne,
          date: formatDate(m.documents?.date_document),
          ref: m.produits?.code_produit,
          designation: m.produits?.nom_produit,
          type: m.documents?.type_document === 'LIVRAISON' ? (m.quantite_livree > 0 ? "Entrée" : "Sortie") : (m.documents?.type_document === 'FACTURE' ? "Sortie" : "Ajustement"),
          document: m.documents?.numero_document,
          quantity: m.quantite_livree || 0
        })) || []

        setProducts((productsRes.data as any) || [])
        setPartners(partnersRes.data as Partenaire[] || [])
        setDocuments(docsRes.data || [])
        setMovements(formattedMovements)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Memoize filtered stock to prevent recalculation on every render
  const filteredStock = useMemo(() =>
    products.filter(item => {
      const familyMatch = selectedFamily === "all" || item.categories_produits?.nom_categorie === selectedFamily
      return familyMatch
    }), [products, selectedFamily]
  )

  // Memoize unique families for filters
  const families = useMemo(() =>
    Array.from(new Set(products.map(item => item.categories_produits?.nom_categorie).filter(Boolean))) as string[],
    [products]
  )

  // Memoize KPI calculations to prevent recalculation on every render
  const { totalStockValue, totalPartners, totalProducts, lowStockCount } = useMemo(() => ({
    totalStockValue: products.reduce((acc, p) => acc + ((p.stock_maximum ?? 0) * (p.prix_achat ?? 0)), 0),
    totalPartners: partners.length,
    totalProducts: products.length,
    lowStockCount: products.filter(p => (p.stock_maximum ?? 0) <= (p.niveau_reappro_quantite ?? 0)).length
  }), [products, partners])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "280px", // Wider sidebar for ERP feel
          "--header-height": "3.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="sidebar"
        collapsible="icon"
        onNavigate={(view) => setCurrentView(view)}
        onTabChange={(tab) => setActiveTab(tab)}
        currentView={currentView}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-6 md:p-8 gap-8 bg-muted/20">
          {currentView === "dashboard" ? (
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(String(val))} className="w-full">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                  <TabsTrigger value="sales">Ventes</TabsTrigger>
                  <TabsTrigger value="purchases">Achats</TabsTrigger>
                  <TabsTrigger value="stock">Stock</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* KPI Section */}
                <SectionCards
                  totalStockValue={totalStockValue}
                  totalPartners={totalPartners}
                  totalProducts={totalProducts}
                  lowStockCount={lowStockCount}
                />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <ChartBarInteractive documents={documents} />
                  </div>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Derniers Partenaires</CardTitle>
                    <CardDescription>Vue d'ensemble des derniers comptes créés.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Ville</TableHead>
                          <TableHead className="text-right">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={5} className="text-center">Chargement...</TableCell></TableRow>
                        ) : partners.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center">Aucun partenaire</TableCell></TableRow>
                        ) : partners.slice(0, 5).map((p) => (
                          <TableRow key={p.id_partenaire}>
                            <TableCell className="font-medium">{p.code_partenaire}</TableCell>
                            <TableCell>{p.nom_partenaire}</TableCell>
                            <TableCell><Badge variant="outline">{p.type_partenaire}</Badge></TableCell>
                            <TableCell>{p.ville || '-'}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={p.est_actif ? "default" : "outline"}>
                                {p.est_actif ? "Actif" : "Inactif"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sales" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
                      <HugeiconsIcon icon={Calculator01Icon} strokeWidth={2} className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{formatPrice(documents.filter(d => d.type_document === 'FACTURE').reduce((acc: number, d: any) => acc + (d.montant_ttc || 0), 0))}</div>
                      <p className="text-xs text-muted-foreground">CA global sur factures confirmées</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Documents Actifs</CardTitle>
                      <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{documents.length}</div>
                      <p className="text-xs text-muted-foreground">Total des pièces en base</p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Documents de Vente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DataTable data={documents} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="purchases" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dernières Opérations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DataTable data={documents.slice(0, 10)} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stock" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Stock Valorisé</CardTitle>
                      <HugeiconsIcon icon={PackageIcon} strokeWidth={2} className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{formatPrice(totalStockValue)}</div>
                      <p className="text-xs text-muted-foreground">{lowStockCount} articles sous le seuil d'alerte</p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Etat du Stock</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={selectedFamily} onValueChange={(value) => setSelectedFamily(value ?? "all")}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les familles</SelectItem>
                          {families.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold">Ref</TableHead>
                          <TableHead className="font-semibold">Désignation</TableHead>
                          <TableHead className="font-semibold">Famille</TableHead>
                          <TableHead className="font-semibold w-[180px]">Niveau Stock</TableHead>
                          <TableHead className="text-right font-semibold">Stock</TableHead>
                          <TableHead className="text-right font-semibold">P.U.</TableHead>
                          <TableHead className="text-right font-semibold">Valeur</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12">
                              <div className="flex items-center justify-center gap-2">
                                <Spinner size="lg" />
                                <span className="text-muted-foreground">Chargement des articles...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredStock.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                              <div className="space-y-2">
                                <HugeiconsIcon icon={PackageIcon} className="h-10 w-10 mx-auto opacity-30" />
                                <p>Aucun produit trouvé</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredStock.slice(0, 20).map((item) => {
                          // Calculate stock level percentage
                          const stockCurrent = item.stock_maximum ?? 0
                          const stockMin = item.niveau_reappro_quantite ?? 10
                          const stockMax = Math.max(stockCurrent, stockMin * 3, 100)
                          const stockPercent = Math.min(100, Math.round((stockCurrent / stockMax) * 100))

                          // Determine variant based on level
                          const stockVariant = stockCurrent <= stockMin
                            ? "danger"
                            : stockCurrent <= stockMin * 2
                              ? "warning"
                              : "success"

                          return (
                            <TableRow key={item.id_produit} className="table-row-hover group">
                              <TableCell className="font-medium text-primary">{item.code_produit}</TableCell>
                              <TableCell className="font-medium">{item.nom_produit}</TableCell>
                              <TableCell className="text-muted-foreground">{item.categories_produits?.nom_categorie || '-'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={stockPercent}
                                    variant={stockVariant}
                                    className="h-2 flex-1"
                                  />
                                  <span className="text-xs text-muted-foreground w-8">{stockPercent}%</span>
                                </div>
                              </TableCell>
                              <TableCell className={`text-right font-semibold ${stockVariant === 'danger' ? 'text-red-600 dark:text-red-400' : stockVariant === 'warning' ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                {stockCurrent}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">{formatPrice(item.prix_achat)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatPrice((item.stock_maximum ?? 0) * (item.prix_achat ?? 0))}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : currentView === "stats-articles" ? (
            <StatsArticlesView products={products} />
          ) : (
            <StockMovementsView movements={movements} />
          )}
        </div>
      </SidebarInset >
    </SidebarProvider >
  )
}



function AppSidebar({ currentView, onNavigate, onTabChange, ...props }: React.ComponentProps<typeof Sidebar> & { currentView?: string, onNavigate?: (view: "dashboard" | "stats-articles" | "stock-movements") => void, onTabChange?: (tab: string) => void }) {
  // Sage 100 Structure
  const structureItems = [
    { title: "Produits", url: "/articles", icon: PackageIcon },
    { title: "Clients", url: "/partners?tab=clients", icon: UserGroupIcon },
    { title: "Fournisseurs", url: "/partners?tab=suppliers", icon: TruckDeliveryIcon },
    { title: "Dépôts de stockage", url: "#", icon: Store01Icon, action: () => { onNavigate?.("dashboard"); onTabChange?.("stock") } },
  ]

  const processingItems = [
    { title: "Documents des ventes", url: "#", icon: Invoice01Icon, action: () => { onNavigate?.("dashboard"); onTabChange?.("sales") } },
    { title: "Documents des achats", url: "#", icon: ShoppingBag01Icon, action: () => { onNavigate?.("dashboard"); onTabChange?.("purchases") } },
    { title: "Mouvements de stock", url: "#", icon: ChartUpIcon, action: () => onNavigate?.("stock-movements") },
    { title: "Saisie d'inventaire", url: "#", icon: File01Icon },
  ]

  const reportItems = [
    { title: "Statistiques Clients", url: "#", icon: Analytics01Icon },
    { title: "Statistiques Articles", url: "#", icon: Calculator01Icon, action: () => onNavigate?.("stats-articles") },
  ]

  const user = {
    name: "Administrateur",
    email: "admin@societe.com",
    avatar: "/avatars/admin.jpg",
  }

  const [activeCompany, setActiveCompany] = React.useState({
    name: "HAY2010",
    plan: "Gestion Commerciale",
    logo: LayersIcon,
  })

  const companies = [
    {
      name: "HAY2010",
      plan: "Gestion Commerciale",
      logo: LayersIcon,
    },
    {
      name: "VOLTRAVE",
      plan: "Gestion Commerciale",
      logo: LayersIcon,
    },
    {
      name: "ECLANOUR",
      plan: "Gestion Commerciale",
      logo: LayersIcon,
    },
  ]

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                render={<DropdownMenuTrigger />}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <HugeiconsIcon icon={activeCompany.logo} className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{activeCompany.name}</span>
                  <span className="truncate text-xs">{activeCompany.plan}</span>
                </div>
                <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} className="ml-auto" />
              </SidebarMenuButton>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Sociétés
                  </DropdownMenuLabel>
                  {companies.map((company) => (
                    <DropdownMenuItem
                      key={company.name}
                      onClick={() => setActiveCompany(company)}
                      className="gap-2 p-2"
                    >
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        <HugeiconsIcon icon={company.logo} className="size-4 shrink-0" />
                      </div>
                      {company.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup title="Navigation" items={[{ title: "Tableau de bord", url: "#", icon: DashboardSquare01Icon, action: () => onNavigate?.("dashboard") }]} />
        <NavGroup title="Structure" items={structureItems} />
        <NavGroup title="Traitement" items={processingItems} />
        <NavGroup title="Etats" items={reportItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NavGroup({ title, items }: { title: string, items: { title: string, url: string, icon: any, action?: () => void }[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            {item.url && item.url !== '#' ? (
              <SidebarMenuButton tooltip={item.title} render={<Link href={item.url} />}>
                <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                <span>{item.title}</span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton tooltip={item.title} onClick={item.action}>
                <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                <span>{item.title}</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavUser({ user }: { user: { name: string; email: string; avatar: string } }) {

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            render={<DropdownMenuTrigger />}
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg">AD</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} className="ml-auto size-4" />
          </SidebarMenuButton>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">AD</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} className="mr-2" />
                Paramètres
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function SiteHeader() {
  return (
    <header className="flex h-[--header-height] shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-lg px-4 sticky top-0 z-40">
      <div className="flex w-full items-center gap-2">
        <SidebarTrigger className="-ml-2 hover:bg-primary/10 transition-colors" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        {/* Enhanced Breadcrumb with gradient */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold gradient-text">Gestion Commerciale</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-muted-foreground font-medium">Tableau de bord</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}

function SectionCards({ totalStockValue, totalPartners, totalProducts, lowStockCount }: { totalStockValue: number, totalPartners: number, totalProducts: number, lowStockCount: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Partners Card */}
      <Card className="card-gradient-1 border-0 card-shadow hover-lift group overflow-hidden relative">
        <div className="absolute inset-0 pattern-dots opacity-30" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Partenaires</CardTitle>
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="h-4 w-4 text-primary icon-bounce" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold tracking-tight gradient-text">{totalPartners}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Clients et Fournisseurs
          </p>
        </CardContent>
      </Card>

      {/* Products Card */}
      <Card className="card-gradient-2 border-0 card-shadow hover-lift group overflow-hidden relative">
        <div className="absolute inset-0 pattern-dots opacity-30" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
          <div className="p-2 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
            <HugeiconsIcon icon={PackageIcon} strokeWidth={2} className="h-4 w-4 text-cyan-600 dark:text-cyan-400 icon-bounce" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold tracking-tight">{totalProducts}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Articles au catalogue
          </p>
        </CardContent>
      </Card>

      {/* Stock Value Card */}
      <Card className="card-gradient-3 border-0 card-shadow hover-lift group overflow-hidden relative">
        <div className="absolute inset-0 pattern-dots opacity-30" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Stock Valorisé</CardTitle>
          <div className="p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
            <HugeiconsIcon icon={Calculator01Icon} strokeWidth={2} className="h-4 w-4 text-emerald-600 dark:text-emerald-400 icon-bounce" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold tracking-tight">{formatPrice(totalStockValue)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Valeur totale stockée
          </p>
        </CardContent>
      </Card>

      {/* Alerts Card */}
      <Card className={`card-gradient-4 border-0 card-shadow hover-lift group overflow-hidden relative ${lowStockCount > 0 ? 'ring-2 ring-red-500/20' : ''}`}>
        <div className="absolute inset-0 pattern-dots opacity-30" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <CardTitle className="text-sm font-medium">Alertes Stock</CardTitle>
          <div className={`p-2 rounded-lg transition-colors ${lowStockCount > 0 ? 'bg-red-500/15 group-hover:bg-red-500/25 pulse-ring' : 'bg-orange-500/10 group-hover:bg-orange-500/20'}`}>
            <HugeiconsIcon icon={Notification01Icon} strokeWidth={2} className={`h-4 w-4 ${lowStockCount > 0 ? 'text-red-500' : 'text-orange-500 dark:text-orange-400'}`} />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className={`text-3xl font-bold tracking-tight ${lowStockCount > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{lowStockCount}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {lowStockCount > 0 ? "Articles sous le seuil d'alerte" : "Aucune rupture à prévoir"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

const ChartBarInteractive = React.memo(function ChartBarInteractive({ documents = [] }: { documents?: any[] }) {
  // Config for the comparison chart
  const COMPARISON_CONFIG = {
    sales: {
      label: "Ventes",
      color: "hsl(var(--chart-1))",
    },
    purchases: {
      label: "Achats",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig

  // Derive chart data from real documents
  type MonthData = { month: string, sales: number, purchases: number }
  const dataByMonth = useMemo(() => {
    const acc: Record<string, MonthData> = documents.reduce((acc, d) => {
      const date = new Date(d.date_document)
      // Format YYYY-MM for sorting and grouping
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, sales: 0, purchases: 0 }
      }

      const amount = d.montant_ttc || 0

      if (d.domaine_document === 'VENTE' && (d.type_document === 'FACTURE' || d.type_document === 'FACTURE_COMPTABILISEE')) {
        acc[monthKey].sales += amount
      } else if (d.domaine_document === 'ACHAT' && (d.type_document === 'FACTURE_ACHAT' || d.type_document === 'BON_RECEPTION')) {
        acc[monthKey].purchases += amount
      }

      return acc
    }, {} as Record<string, MonthData>)

    return (Object.values(acc) as MonthData[]).sort((a, b) => a.month.localeCompare(b.month))
  }, [documents])

  const hasData = dataByMonth.length > 0

  return (
    <Card className="h-full card-shadow border-0 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <HugeiconsIcon icon={Analytics01Icon} className="h-5 w-5 text-primary" />
          <span className="gradient-text">Performance Commerciale</span>
        </CardTitle>
        <CardDescription>
          Comparatif Ventes vs Achats (TTC) par mois
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={COMPARISON_CONFIG} className="aspect-video w-full h-[400px]">
          {hasData ? (
            <BarChart accessibilityLayer data={dataByMonth}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => {
                  const [year, month] = value.split('-')
                  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('fr-FR', { month: 'short' })
                }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <Legend content={<ChartLegendContent />} />
              <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
              <Bar dataKey="purchases" fill="var(--color-purchases)" radius={4} />
            </BarChart>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
              <div className="text-center space-y-2">
                <HugeiconsIcon icon={ChartUpIcon} className="h-12 w-12 mx-auto opacity-30" />
                <p>En attente de données de mouvement</p>
              </div>
            </div>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
})

const DataTable = React.memo(function DataTable({ data }: { data: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[100px] font-semibold">Numéro</TableHead>
          <TableHead className="font-semibold">Date</TableHead>
          <TableHead className="font-semibold">Tiers</TableHead>
          <TableHead className="font-semibold">Type</TableHead>
          <TableHead className="text-right font-semibold">Montant</TableHead>
          <TableHead className="text-right font-semibold">Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
              <div className="space-y-2">
                <HugeiconsIcon icon={Invoice01Icon} className="h-10 w-10 mx-auto opacity-30" />
                <p>Aucun document trouvé</p>
              </div>
            </TableCell>
          </TableRow>
        ) : data.map((doc) => (
          <TableRow key={doc.id_document} className="table-row-hover group">
            <TableCell className="font-medium text-primary">{doc.numero_document}</TableCell>
            <TableCell className="text-muted-foreground">{new Date(doc.date_document).toLocaleDateString('fr-FR')}</TableCell>
            <TableCell className="font-medium">{doc.partenaires?.nom_partenaire || doc.nom_partenaire_date || '-'}</TableCell>
            <TableCell>
              <Badge variant="outline" className="font-normal">
                {doc.type_document}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-semibold">{formatPrice(doc.montant_ttc)}</TableCell>
            <TableCell className="text-right">
              <Badge
                variant={doc.statut_document === "FACTURE" || doc.statut_document === "CONFIRME" ? "default" : "outline"}
                className={doc.statut_document === "FACTURE" || doc.statut_document === "CONFIRME" ? "bg-primary/90" : ""}
              >
                {doc.statut_document}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
})
