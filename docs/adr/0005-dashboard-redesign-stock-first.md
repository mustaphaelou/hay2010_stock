# ADR-0005: Dashboard Redesign — Stock-First (A1 Visual Language)

**Date:** 2026-06-01
**Status:** Accepted

## Context

The current dashboard (`app/(dashboard)/page.tsx`) was assembled during the initial visual iteration. It serves a French-language ERP for stock, sales, purchases, partners, and affairs, but its information architecture is **finance-first**:

- 4 KPI cards (Chiffre d'Affaires, Total Achats, Marge Commerciale, Taux de Règlement) all framed in euros/MAD as the primary signal.
- 1 multi-color stacked-area chart (Ventes / Achats / Marge) using three hardcoded HSL accents.
- 2 radial gauges (Logistique, Recouvrement) — the second one duplicates the KPI "Taux de Règlement" above it.
- "Activité récente" feed with 3 mixed sources and status-colored badges.
- "Alertes & Notifications" widget built on a 4-severity background system (red/orange/yellow/blue).
- "Top Produits" widget built on e-commerce primitives (rating stars, `$` currency, sparkline, percentage trend).
- A full-width monthly performance table.

The user is the only developer on the project and wants the dashboard to be **stock-first** (alerts, today's movements, top products with stock levels) with a **shadcn-like pro / Linear-style** visual language (A1). The current state has redundant signals (payment rate shown twice), colorful gradients that fight the existing `base-nova` + `stone` Tailwind config, and "e-commerce flavored" widgets that don't fit a B2B ERP.

## Decision

Apply an in-place visual polish (no full rebuild) following the A1 reference. Locked-in decisions from the 2026-06-01 design session:

### 11 design decisions

1. **Scope** — A. In-place polish (no full rebuild).
2. **Visual reference** — A1. shadcn-studio / Linear-style.
3. **KPI card treatment** — A1a. Neutral card + 2-px left-border accent + status dot.
4. **Chart treatment** — A1g1. Monochrome accent (theme `--chart-1`), overlapping translucent areas, no legend, drop the `<linearGradient>` in `<defs>` and `stackId="a"`.
5. **Gauges** — A1j1. Delete the two `PerformanceGauge` usages; fold into KPI cards as inline 2-px progress bar on cards 2 and 3 only.
6. **Page composition** — A1k1. Header → KPI row → 3-up operational band → 8/4 chart+feed → full-width table.
7. **KPI choice** — A1n1. Chiffre d'Affaires · Stock disponible · Ruptures & stock bas · Marge brute (in that order).
8. **Alertes stock panel** — A1p1. Left-border (`bg-destructive` / `bg-amber-500` / `bg-emerald-500` / `bg-border`) + status dot + status text label. One row per (product, entrepôt) pair. Max 6, "Voir tout" → `/stock?filter=low`.
9. **Mouvements du jour panel** — A1q1. Type-icon (ENTREE / SORTIE / TRANSFERT / INVENTAIRE) + product + signed qty + entrepôt + relative time. Max 8, "Voir tout" → `/stock?filter=today`.
10. **Top produits panel** — A1r1. Product + sales count + stock level + status pill. No rating, no trend, no sparkline. Max 6, "Voir tout" → `/sales?filter=top`.
11. **Right rail (Activité récente)** — A1s1. Re-skin to A1, compact 2-line rows (title + relative time + 11 px type chip "DOC" / "STK" / "PRT"), no description, no status colors, 1-px `border-b border-border/50` between rows. Max 8, "Voir tout" → `/documents`.

### Bundled polish items

- **Header** — drop the `bg-gradient-to-r from-primary to-primary/70 bg-clip-text` on the H1; replace with solid `text-foreground tracking-tight`. Single-row action bar on `lg+`, wrapping on mobile.
- **Table** — migrate raw `<table>` HTML in `enhanced-dashboard-view.tsx:298-331` to shadcn `Table` from `components/ui/table.tsx`. Same columns, A1 styling (`hover:bg-muted/30`, no zebra).
- **Number formatting bug** — `StatsOverviewCard` `AnimatedNumber` (line 129) and the non-animated branch (line 304) use `value.toLocaleString()` with no locale → browser default (en-US). Fix to `fr-MA` (space thousands, comma decimal). Append ` MAD` consistently. The `formatValue` helper in `enhanced-dashboard-view.tsx:139-151` already does this correctly — copy the pattern.
- **`$` → `MAD` bug** — `TopProductsWidget:319` uses `${product.revenue.toLocaleString()}`. Fix to ` MAD` with `fr-MA` locale. (Resolved in Slice 7.)
- **Unify currency display** — KPI suffixes (` MAD`) are inconsistent with `formatValue`. Unify to one helper.
- **Hover lift** — `-translate-y-0.5` on KPI cards is Material-y. Replace with `hover:border-foreground/30 hover:bg-muted/20`.
- **Staggered fade-ins** — `AlertsWidget`, `TopProductsWidget`, `RecentActivityFeed` use `IntersectionObserver` with `opacity + translateY(10px)` + 50 ms stagger. Keep the opacity fade, reduce `translateY` to 4 px or drop entirely.
- **Empty states** — `AlertsWidget` "All caught up!" with green checkmark + `bg-emerald-50` is celebratory. Replace with monochrome icon + neutral text.
- **Date range picker** — shown in header but not wired to data. Recommendation: **remove** from the header in this redesign. Do not wire it up — that's a separate, larger refactor (cache invalidation by date, period-over-period comparison). File a follow-up issue if the user wants it back.
- **Background** — keep transparent on the main area; cards on `bg-card`. Do not add a tinted background — Linear-style is white-on-white with borders.
- **Dead props** — `sparklineData` and `trend` on `kpiCards` are never passed. Drop them from the new `KPIRow` composition.

### New read-only data fields

Extend `getDashboardStats` in `lib/dashboard/dashboard-service.ts` (additive, reads only, rides the existing `DASHBOARD:stats` cache key):

- `rupturesCount: number` — `count(quantite_en_stock = 0)` over `NiveauStock` × `Produit` where `produit.activer_suivi_stock = true`.
- `lowStockItems: Array<{ id_produit, code_produit, nom_produit, id_entrepot, nom_entrepot, quantite_en_stock, niveau_reappro_quantite, status: 'rupture' | 'bas' }>` — single Prisma query joining `NiveauStock` × `Produit` × `Entrepot` where `quantite_en_stock <= COALESCE(niveau_reappro_quantite, 0)`. Order: `rupture` first, then `bas` by ratio asc. Limit 6 in the query.
- `todaysMovements: DashboardMovementData[]` — reuse the existing `DashboardMovementData` type at `lib/dashboard/dashboard-service.ts:132-140`. Query `MouvementStock` joined to `Produit` + `Entrepot` + `Document` where `date_mouvement >= today_start` (server-local timezone). Limit 8.

These are reads; direct Prisma is allowed per `CONTEXT.md` Stock Mutation Model rules.

## Consequences

- + Stock-first information architecture; alerts, today's movements, and top products with stock levels appear above the fold where a stock manager expects them.
- + Monochrome A1 look matches the existing `base-nova` + `stone` Tailwind config; no more full-bleed gradient cards fighting the theme accent.
- + Removes the payment-rate / gauge redundancy (Taux de Règlement was shown both as KPI and as a gauge).
- + Reduces 4 visual variants (`default`, `success`, `warning`, `danger`, `info`) on the KPI card to a single `tone` prop, which is what shadcn-native A1 designs use.
- − Two new read queries per dashboard load (mitigated by the existing 60 s cache and the fact that they ride the `DASHBOARD:stats` cache key unchanged).
- − `PerformanceGauge` and `AlertsWidget` lose their dashboard callers (other pages are unaffected; the files are kept for any future re-use).
- − `DateRangePicker` is removed from the dashboard header in this redesign. The component itself is untouched; if the user wants it back wired to data, that's a follow-up issue (cache invalidation by date + period comparison is non-trivial).

## Alternatives considered

- **A2 (shadcn-admin colorful)** — rejected as too noisy for an ERP, especially for users who stare at the dashboard all day.
- **A3 (Vercel monochrome)** — rejected as too sparse for this data density; a stock manager needs the alerts and the daily movement count visible at a glance.
- **B / C / D (full rebuild or hybrid stock-first + rebuild)** — rejected as too risky for a one-developer project. The current dashboard wiring is brittle (cache, auto-refresh, server action contract) and a rewrite would burn a week for marginal benefit. In-place polish with tracer-bullet vertical slices keeps the working state at all times.

## Out of scope (explicit non-goals)

- Data warehouse, schema, or migrations.
- The 8 other ERP pages (`articles`, `partners`, `customers`, `suppliers`, `documents`, `sales`, `purchases`, `affaires`, `settings`, `admin`, `stock`) — they import dashboard widgets but do not need any change for A1.
- The auth layer (`lib/auth/`, `middleware.ts`).
- The `Document` / `MouvementStock` / `NiveauStock` / `Partenaire` services in `lib/`.
- The 8 API routes under `app/api/v1/`.
- The `Sidebar` / `SiteHeader` / `BottomNav` shell components (`components/erp/`).
- The `ThemeCustomizer` (the chart palette already follows the theme via `hsl(var(--chart-1))`).
- The `CommandPalette` (orthogonal).
- The `DateRangePicker` itself (the component stays; we just stop rendering it in the dashboard header).
