import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { DashboardMovementData } from '@/lib/types'
import { TodaysMovements } from '@/components/dashboard/widgets/todays-movements'

const now = new Date()
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000)
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60_000)

const entree: DashboardMovementData = {
  id: 1,
  date: minutesAgo(5).toISOString(),
  ref: 'A-001',
  designation: 'Vis M6',
  type: 'ENTREE',
  document: 'FAC-2026-0001',
  quantity: 25,
}

const sortie: DashboardMovementData = {
  id: 2,
  date: minutesAgo(45).toISOString(),
  ref: 'A-002',
  designation: 'Boulon M8',
  type: 'SORTIE',
  document: 'LIV-2026-0007',
  quantity: 12,
}

const transfert: DashboardMovementData = {
  id: 3,
  date: hoursAgo(2).toISOString(),
  ref: 'A-003',
  designation: 'Rondelle M10',
  type: 'TRANSFERT',
  document: 'TR-2026-0003',
  quantity: 50,
}

const inventaire: DashboardMovementData = {
  id: 4,
  date: hoursAgo(5).toISOString(),
  ref: 'A-004',
  designation: 'Écrou M6',
  type: 'INVENTAIRE',
  document: 'INV-2026-0002',
  quantity: 8,
}

describe("TodaysMovements — A1q1 mouvements du jour panel", () => {
  it('renders one row per movement with a data-slot marker', () => {
    render(<TodaysMovements movements={[entree, sortie, transfert, inventaire]} />)

    const rows = screen.getAllByTestId('todays-movements-row')
    expect(rows).toHaveLength(4)
  })

  it('shows the product code and product name in each row', () => {
    render(<TodaysMovements movements={[entree]} />)

    expect(screen.getByText('A-001')).toBeInTheDocument()
    expect(screen.getByText('Vis M6')).toBeInTheDocument()
  })

  it('shows a positive signed quantity for ENTREE movements', () => {
    const { container } = render(<TodaysMovements movements={[entree]} />)

    const qty = container.querySelector(
      '[data-testid="todays-movements-row"][data-type="ENTREE"] [data-slot="todays-movements-qty"]',
    )
    expect(qty).toBeInTheDocument()
    expect(qty?.textContent).toMatch(/^\+/)
    expect(qty?.textContent).toMatch(/25/)
  })

  it('shows a negative signed quantity for SORTIE movements', () => {
    const { container } = render(<TodaysMovements movements={[sortie]} />)

    const qty = container.querySelector(
      '[data-testid="todays-movements-row"][data-type="SORTIE"] [data-slot="todays-movements-qty"]',
    )
    expect(qty).toBeInTheDocument()
    expect(qty?.textContent).toMatch(/^-/)
    expect(qty?.textContent).toMatch(/12/)
  })

  it('shows a positive signed quantity for INVENTAIRE movements', () => {
    const { container } = render(<TodaysMovements movements={[inventaire]} />)

    const qty = container.querySelector(
      '[data-testid="todays-movements-row"][data-type="INVENTAIRE"] [data-slot="todays-movements-qty"]',
    )
    expect(qty).toBeInTheDocument()
    expect(qty?.textContent).toMatch(/^\+/)
    expect(qty?.textContent).toMatch(/8/)
  })

  it('renders a type icon slot for every movement type', () => {
    const { container } = render(
      <TodaysMovements movements={[entree, sortie, transfert, inventaire]} />,
    )

    for (const type of ['ENTREE', 'SORTIE', 'TRANSFERT', 'INVENTAIRE']) {
      const icon = container.querySelector(
        `[data-testid="todays-movements-row"][data-type="${type}"] [data-slot="todays-movements-type-icon"]`,
      )
      expect(icon).toBeInTheDocument()
    }
  })

  it('renders a relative time string per row', () => {
    render(<TodaysMovements movements={[entree, sortie, transfert]} />)

    expect(screen.getByText(/il y a 5 min/i)).toBeInTheDocument()
    expect(screen.getByText(/il y a 45 min/i)).toBeInTheDocument()
    expect(screen.getByText(/il y a 2 h/i)).toBeInTheDocument()
  })

  it('truncates the list to a maximum of 8 rows', () => {
    const manyMovements: DashboardMovementData[] = Array.from({ length: 12 }, (_, i) => ({
      id: 1000 + i,
      date: new Date(now.getTime() - i * 60_000).toISOString(),
      ref: `A-${String(i).padStart(3, '0')}`,
      designation: `Produit ${i}`,
      type: 'ENTREE' as const,
      document: `DOC-${i}`,
      quantity: 1,
    }))

    render(<TodaysMovements movements={manyMovements} />)

    expect(screen.getAllByTestId('todays-movements-row')).toHaveLength(8)
  })

  it('respects a custom maxItems override', () => {
    const manyMovements: DashboardMovementData[] = Array.from({ length: 6 }, (_, i) => ({
      id: 2000 + i,
      date: new Date(now.getTime() - i * 60_000).toISOString(),
      ref: `B-${String(i).padStart(3, '0')}`,
      designation: `Produit ${i}`,
      type: 'SORTIE' as const,
      document: `DOC-${i}`,
      quantity: 1,
    }))

    render(<TodaysMovements movements={manyMovements} maxItems={3} />)

    expect(screen.getAllByTestId('todays-movements-row')).toHaveLength(3)
  })

  it('renders a "Voir tout" link pointing to /stock?filter=today', () => {
    render(<TodaysMovements movements={[entree, sortie]} />)

    const link = screen.getByRole('link', { name: /voir tout/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/stock?filter=today')
  })

  it('hides the "Voir tout" link when there are no movements', () => {
    render(<TodaysMovements movements={[]} />)

    expect(screen.queryByRole('link', { name: /voir tout/i })).not.toBeInTheDocument()
  })

  it('renders a monochrome empty state when no movements are provided', () => {
    const { container } = render(<TodaysMovements movements={[]} />)

    const empty = container.querySelector('[data-slot="todays-movements-empty"]')
    expect(empty).toBeInTheDocument()
    expect(screen.getByText(/aucun mouvement/i)).toBeInTheDocument()
  })

  it('shows the document reference per row when present', () => {
    const { container } = render(<TodaysMovements movements={[entree]} />)

    const row = container.querySelector(
      '[data-testid="todays-movements-row"][data-type="ENTREE"]',
    )
    expect(within(row as HTMLElement).getByText('FAC-2026-0001')).toBeInTheDocument()
  })
})
