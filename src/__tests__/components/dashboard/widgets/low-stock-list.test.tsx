import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DashboardLowStockItem } from '@/lib/types'
import { LowStockList } from '@/components/dashboard/widgets/low-stock-list'

const ruptureItem: DashboardLowStockItem = {
  id_produit: 10,
  code_produit: 'A-001',
  nom_produit: 'Vis M6',
  id_entrepot: 1,
  nom_entrepot: 'Principal',
  quantite_en_stock: 0,
  niveau_reappro_quantite: 5,
  status: 'rupture',
}

const basItem: DashboardLowStockItem = {
  id_produit: 11,
  code_produit: 'A-002',
  nom_produit: 'Boulon M8',
  id_entrepot: 1,
  nom_entrepot: 'Principal',
  quantite_en_stock: 3,
  niveau_reappro_quantite: 10,
  status: 'bas',
}

describe('LowStockList — A1p1 alertes stock panel', () => {
  it('renders one row per (product, entrepôt) pair with a data-slot marker', () => {
    render(<LowStockList items={[ruptureItem, basItem]} />)

    const rows = screen.getAllByTestId('low-stock-row')
    expect(rows).toHaveLength(2)
  })

  it('shows the product code and product name in each row', () => {
    render(<LowStockList items={[ruptureItem]} />)

    expect(screen.getByText('A-001')).toBeInTheDocument()
    expect(screen.getByText('Vis M6')).toBeInTheDocument()
  })

  it('shows the entrepôt name in each row', () => {
    render(<LowStockList items={[ruptureItem]} />)

    expect(screen.getByText('Principal')).toBeInTheDocument()
  })

  it('renders a destructive left-border on a rupture row', () => {
    const { container } = render(<LowStockList items={[ruptureItem]} />)

    const border = container.querySelector(
      '[data-testid="low-stock-row"][data-status="rupture"] [data-slot="low-stock-row-border"]',
    )
    expect(border).toBeInTheDocument()
    expect(border?.className).toMatch(/bg-destructive/)
  })

  it('renders an amber left-border on a bas row', () => {
    const { container } = render(<LowStockList items={[basItem]} />)

    const border = container.querySelector(
      '[data-testid="low-stock-row"][data-status="bas"] [data-slot="low-stock-row-border"]',
    )
    expect(border).toBeInTheDocument()
    expect(border?.className).toMatch(/bg-amber-500/)
  })

  it('truncates the list to a maximum of 6 rows', () => {
    const manyItems: DashboardLowStockItem[] = Array.from({ length: 10 }, (_, i) => ({
      id_produit: 100 + i,
      code_produit: `A-${String(i).padStart(3, '0')}`,
      nom_produit: `Produit ${i}`,
      id_entrepot: 1,
      nom_entrepot: 'Principal',
      quantite_en_stock: 0,
      niveau_reappro_quantite: 5,
      status: 'rupture' as const,
    }))

    render(<LowStockList items={manyItems} />)

    expect(screen.getAllByTestId('low-stock-row')).toHaveLength(6)
  })

  it('respects a custom maxItems override', () => {
    const manyItems: DashboardLowStockItem[] = Array.from({ length: 8 }, (_, i) => ({
      id_produit: 200 + i,
      code_produit: `B-${String(i).padStart(3, '0')}`,
      nom_produit: `Produit ${i}`,
      id_entrepot: 1,
      nom_entrepot: 'Principal',
      quantite_en_stock: 2,
      niveau_reappro_quantite: 5,
      status: 'bas' as const,
    }))

    render(<LowStockList items={manyItems} maxItems={3} />)

    expect(screen.getAllByTestId('low-stock-row')).toHaveLength(3)
  })

  it('renders a "Voir tout" link pointing to /stock?filter=low', () => {
    render(<LowStockList items={[ruptureItem, basItem]} />)

    const link = screen.getByRole('link', { name: /voir tout/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/stock?filter=low')
  })

  it('hides the "Voir tout" link when there are no items', () => {
    render(<LowStockList items={[]} />)

    expect(screen.queryByRole('link', { name: /voir tout/i })).not.toBeInTheDocument()
  })

  it('renders a monochrome empty state when no items are provided', () => {
    const { container } = render(<LowStockList items={[]} />)

    const empty = container.querySelector('[data-slot="low-stock-list-empty"]')
    expect(empty).toBeInTheDocument()
    expect(screen.getByText(/aucune alerte/i)).toBeInTheDocument()
  })
})
