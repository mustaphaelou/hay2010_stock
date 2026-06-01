import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { RecentActivityFeed, type ActivityItem } from '@/components/dashboard/enhanced/recent-activity-feed'

const now = new Date()
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000)
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60_000)

const documentItem: ActivityItem = {
  id: '42',
  type: 'document',
  title: 'Facture FAC-2026-0001',
  description: 'Client: ACME SARL — 12 500 MAD',
  timestamp: minutesAgo(5),
  status: 'success',
}

const stockItem: ActivityItem = {
  id: '7',
  type: 'stock_movement',
  title: 'Sortie de stock — Vis M6',
  description: 'Quantité: -25',
  timestamp: minutesAgo(45),
  status: 'warning',
}

const partnerItem: ActivityItem = {
  id: '3',
  type: 'partner',
  title: 'Nouveau partenaire — Société Beta',
  description: 'Type: Client',
  timestamp: hoursAgo(2),
  status: 'info',
}

describe('RecentActivityFeed — A1s1 right rail re-skin', () => {
  it('renders one row per item with a data-testid marker, title, and relative time', () => {
    render(
      <RecentActivityFeed items={[documentItem, stockItem, partnerItem]} maxItems={10} />,
    )

    const rows = screen.getAllByTestId('activity-row')
    expect(rows).toHaveLength(3)

    expect(within(rows[0]).getByText('Facture FAC-2026-0001')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Sortie de stock — Vis M6')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Nouveau partenaire — Société Beta')).toBeInTheDocument()

    expect(within(rows[0]).getByText(/il y a 5 min/i)).toBeInTheDocument()
    expect(within(rows[1]).getByText(/il y a 45 min/i)).toBeInTheDocument()
    expect(within(rows[2]).getByText(/il y a 2 h/i)).toBeInTheDocument()
  })

  it('renders an 11 px DOC/STK/PRT type chip on the left, derived from item.type', () => {
    const { container } = render(
      <RecentActivityFeed items={[documentItem, stockItem, partnerItem]} maxItems={10} />,
    )

    const docChip = container.querySelector(
      '[data-testid="activity-row"][data-type="document"] [data-slot="activity-type-chip"]',
    )
    const stkChip = container.querySelector(
      '[data-testid="activity-row"][data-type="stock_movement"] [data-slot="activity-type-chip"]',
    )
    const prtChip = container.querySelector(
      '[data-testid="activity-row"][data-type="partner"] [data-slot="activity-type-chip"]',
    )

    expect(docChip).toBeInTheDocument()
    expect(docChip?.textContent).toMatch(/^DOC$/)
    expect(stkChip).toBeInTheDocument()
    expect(stkChip?.textContent).toMatch(/^STK$/)
    expect(prtChip).toBeInTheDocument()
    expect(prtChip?.textContent).toMatch(/^PRT$/)

    // 11 px font size — surfaced via the Tailwind text-[11px] arbitrary class
    // so it survives theme changes.
    expect(docChip?.className).toMatch(/text-\[11px\]/)
  })

  it('does not render the item.description anywhere', () => {
    render(
      <RecentActivityFeed items={[documentItem, stockItem, partnerItem]} maxItems={10} />,
    )

    expect(screen.queryByText('Client: ACME SARL — 12 500 MAD')).not.toBeInTheDocument()
    expect(screen.queryByText('Quantité: -25')).not.toBeInTheDocument()
    expect(screen.queryByText('Type: Client')).not.toBeInTheDocument()
  })

  it('does not let the status prop drive row background or icon colour', () => {
    const { container } = render(
      <RecentActivityFeed items={[documentItem, stockItem, partnerItem]} maxItems={10} />,
    )

    // No shadcn Badge component should be rendered for the status.
    expect(container.querySelector('[data-slot="badge"]')).not.toBeInTheDocument()

    // The raw status string (success/warning/info) must not leak into the DOM
    // as visible text in any row.
    const rows = screen.getAllByTestId('activity-row')
    for (const row of rows) {
      expect(row.textContent ?? '').not.toMatch(/\bsuccess\b/i)
      expect(row.textContent ?? '').not.toMatch(/\bwarning\b/i)
      expect(row.textContent ?? '').not.toMatch(/\binfo\b/i)
      expect(row.textContent ?? '').not.toMatch(/\berror\b/i)
    }

    // No status-tinted backgrounds on rows or their children.
    const allRowDescendants = container.querySelectorAll(
      '[data-testid="activity-row"], [data-testid="activity-row"] *',
    )
    for (const el of allRowDescendants) {
      const className = (el as HTMLElement).className ?? ''
      const classes = typeof className === 'string' ? className : String(className)
      expect(classes).not.toMatch(/\bbg-success\b/)
      expect(classes).not.toMatch(/\bbg-warning\b/)
      expect(classes).not.toMatch(/\bbg-destructive\b/)
      expect(classes).not.toMatch(/\bbg-info\b/)
      expect(classes).not.toMatch(/\bbg-amber\b/)
      expect(classes).not.toMatch(/\btext-success\b/)
      expect(classes).not.toMatch(/\btext-warning\b/)
      expect(classes).not.toMatch(/\btext-destructive\b/)
      expect(classes).not.toMatch(/\btext-info\b/)
    }
  })

  it('separates each row from the next with a 1 px border-b border-border/50 rule', () => {
    render(
      <RecentActivityFeed items={[documentItem, stockItem, partnerItem]} maxItems={10} />,
    )

    const rows = screen.getAllByTestId('activity-row')
    expect(rows).toHaveLength(3)

    for (const row of rows) {
      const tokens = row.className.split(/\s+/)
      expect(tokens).toContain('border-b')
      expect(tokens).toContain('border-border/50')
    }
  })

  it('routes document rows to /documents/[id]', () => {
    const { container } = render(<RecentActivityFeed items={[documentItem]} />)

    const link = container.querySelector<HTMLAnchorElement>(
      '[data-testid="activity-row"][data-type="document"] a',
    )
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/documents/42')
  })

  it('routes stock_movement rows to /stock/movements/[id]', () => {
    const { container } = render(<RecentActivityFeed items={[stockItem]} />)

    const link = container.querySelector<HTMLAnchorElement>(
      '[data-testid="activity-row"][data-type="stock_movement"] a',
    )
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/stock/movements/7')
  })

  it('routes partner rows to /partners/[id]', () => {
    const { container } = render(<RecentActivityFeed items={[partnerItem]} />)

    const link = container.querySelector<HTMLAnchorElement>(
      '[data-testid="activity-row"][data-type="partner"] a',
    )
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/partners/3')
  })

  it('lets an explicit item.href override the type-keyed route', () => {
    const overridden: ActivityItem = { ...documentItem, href: '/documents/42/edit' }
    const { container } = render(<RecentActivityFeed items={[overridden]} />)

    const link = container.querySelector<HTMLAnchorElement>(
      '[data-testid="activity-row"] a',
    )
    expect(link).toHaveAttribute('href', '/documents/42/edit')
  })

  it('renders an empty state when there are no items', () => {
    render(<RecentActivityFeed items={[]} />)

    expect(screen.getByText(/aucune activité récente/i)).toBeInTheDocument()
    expect(screen.queryAllByTestId('activity-row')).toHaveLength(0)
  })

  it('renders a "Voir tout" link pointing to the viewAllHref when showViewAll is true', () => {
    render(
      <RecentActivityFeed
        items={[documentItem]}
        showViewAll
        viewAllHref="/documents"
      />,
    )

    const link = screen.getByRole('button', { name: /voir toute l'activité/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/documents')
  })

  it('truncates the list to maxItems', () => {
    const manyItems: ActivityItem[] = Array.from({ length: 12 }, (_, i) => ({
      id: String(1000 + i),
      type: 'document' as const,
      title: `Item ${i}`,
      timestamp: minutesAgo(i),
    }))

    render(<RecentActivityFeed items={manyItems} maxItems={5} />)

    expect(screen.getAllByTestId('activity-row')).toHaveLength(5)
  })
})
