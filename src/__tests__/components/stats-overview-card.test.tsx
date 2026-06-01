import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsOverviewCard } from '@/components/dashboard/enhanced/stats-overview-card'

vi.mock('@/lib/hooks/use-reduced-motion', () => ({
  useReducedMotion: vi.fn().mockReturnValue(true),
}))

describe('StatsOverviewCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the title', () => {
      render(<StatsOverviewCard title="Chiffre d'Affaires" value={50000} tone="success" suffix=" MAD" />)
      expect(screen.getByText("Chiffre d'Affaires")).toBeInTheDocument()
    })

    it('formats a numeric value with fr-MA locale and appends the MAD suffix', () => {
      const { container } = render(
        <StatsOverviewCard title="Stock" value={1234567} tone="default" suffix=" MAD" />
      )
      // The exact thousands separator depends on the ICU build (real browsers
      // use NARROW NO-BREAK SPACE for fr-MA; older ICU builds may use dots).
      // We assert the number is locale-formatted (not raw "1234567") and the
      // MAD suffix is present.
      const valueText = container.querySelector('[data-slot="card-content"]')?.textContent ?? ''
      expect(valueText).not.toContain('1234567')
      expect(valueText).toMatch(/1[^\d]234[^\d]567\s*MAD/)
    })

    it('does not render the suffix when none is provided', () => {
      render(<StatsOverviewCard title="Taux" value={42} tone="default" />)
      // "42" formatted with fr-MA + maxFractionDigits:0 stays "42" and no " MAD"
      expect(screen.queryByText(/MAD/)).not.toBeInTheDocument()
    })
  })

  describe('A1a neutral card style', () => {
    it('renders a neutral card (no full-bleed gradient backgrounds)', () => {
      const { container } = render(
        <StatsOverviewCard title="Test" value={100} tone="default" />
      )
      const card = container.querySelector('[data-slot="card"]')
      expect(card).not.toHaveClass('bg-gradient-to-br')
      expect(card).not.toHaveClass('bg-gradient-to-r')
      expect(card).toHaveClass('border')
      expect(card).toHaveClass('bg-card')
    })

    it('renders a 2-px left-border accent in the tone color', () => {
      const { container } = render(
        <StatsOverviewCard title="Test" value={100} tone="success" />
      )
      const card = container.querySelector('[data-slot="card"]')
      expect(card).toHaveClass('border-l-2')
      // The Tailwind class for tone=success border-l color
      expect(card?.className).toMatch(/border-l-(emerald|green)-500/)
    })

    it.each([
      ['default', /border-l-primary/],
      ['warning', /border-l-amber-500/],
      ['danger', /border-l-(red-500|destructive)/],
      ['info', /border-l-blue-500/],
    ] as const)('maps tone=%s to a 2-px left-border in the right color family', (tone, pattern) => {
      const { container } = render(
        <StatsOverviewCard title="Test" value={100} tone={tone} />
      )
      const card = container.querySelector('[data-slot="card"]')
      expect(card?.className).toMatch(pattern)
    })

    it('renders a status dot in the tone color', () => {
      const { container } = render(
        <StatsOverviewCard title="Test" value={100} tone="danger" />
      )
      // Status dot is a small rounded-full span in tone color
      const dot = container.querySelector('span.rounded-full.bg-red-500, span.rounded-full.bg-destructive')
      expect(dot).toBeInTheDocument()
    })
  })

  describe('inline 2-px progress bar', () => {
    it('does not render a progress bar when progress is undefined', () => {
      const { container } = render(
        <StatsOverviewCard title="Test" value={100} tone="default" />
      )
      // No element with data-slot="progress"
      expect(container.querySelector('[data-slot="kpi-progress"]')).not.toBeInTheDocument()
    })

    it('renders a 2-px progress bar when progress is provided', () => {
      const { container } = render(
        <StatsOverviewCard title="Test" value={100} tone="default" progress={75} />
      )
      const bar = container.querySelector('[data-slot="kpi-progress"]')
      expect(bar).toBeInTheDocument()
      // 2 px tall (h-0.5 = 0.125rem = 2px at default 16px base)
      expect(bar).toHaveClass('h-0.5')
    })

    it('uses the tone color for the progress fill', () => {
      const { container } = render(
        <StatsOverviewCard title="Test" value={100} tone="warning" progress={50} />
      )
      const fill = container.querySelector('[data-slot="kpi-progress-fill"]')
      expect(fill).toBeInTheDocument()
      expect(fill?.className).toMatch(/bg-amber-500/)
    })

    it('clamps progress fill width to 0-100%', () => {
      const { container } = render(
        <StatsOverviewCard title="Test" value={100} tone="default" progress={33} />
      )
      const fill = container.querySelector('[data-slot="kpi-progress-fill"]') as HTMLElement
      expect(fill).toBeInTheDocument()
      expect(fill.style.width).toBe('33%')
    })
  })
})
