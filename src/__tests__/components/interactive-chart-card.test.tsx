import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { InteractiveChartCard } from '@/components/dashboard/enhanced/interactive-chart-card'

vi.mock('@/lib/hooks/use-reduced-motion', () => ({
  useReducedMotion: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/hooks/use-breakpoint', () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
  useIsDesktop: vi.fn().mockReturnValue(true),
  useBreakpoint: vi.fn().mockReturnValue('lg'),
}))

const mockState = vi.hoisted(() => ({
  areas: [] as Array<{ dataKey: string; fill?: string; stroke?: string; fillOpacity?: number; stackId?: unknown }>,
  legends: [] as Array<Record<string, unknown>>,
  chartLegendRenders: 0,
  containerConfigs: [] as Array<{ config: Record<string, { label?: unknown; color?: string }> }>,
  linearGradients: 0,
}))

vi.mock('recharts', () => {
  const makeArea = (key: 'Area' | 'Bar' | 'Line') => {
    const Stub = ((props: Record<string, unknown>) => {
      if (key === 'Area') {
        mockState.areas.push({
          dataKey: props.dataKey as string,
          fill: props.fill as string | undefined,
          stroke: props.stroke as string | undefined,
          fillOpacity: props.fillOpacity as number | undefined,
          stackId: props.stackId,
        })
      }
      return null
    }) as unknown as React.FC
    Stub.displayName = key
    return Stub
  }
  return {
    Area: makeArea('Area'),
    AreaChart: ({ children }: { children?: React.ReactNode }) => {
      mockState.linearGradients = countLinearGradients(children)
      return <div data-testid="area-chart">{children}</div>
    },
    Bar: makeArea('Bar'),
    BarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Line: makeArea('Line'),
    LineChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    Tooltip: () => null,
    Legend: ((props: Record<string, unknown>) => {
      mockState.legends.push(props)
      return null
    }) as unknown as React.FC,
  }
})

function countLinearGradients(node: React.ReactNode): number {
  let count = 0
  const visit = (n: React.ReactNode) => {
    if (!n) return
    if (Array.isArray(n)) {
      n.forEach(visit)
      return
    }
    if (typeof n !== 'object') return
    const el = n as { type?: unknown; props?: { children?: React.ReactNode } }
    const typeName = typeof el.type === 'string' ? el.type : ''
    if (typeName === 'linearGradient') {
      count += 1
    }
    if (el.props?.children) visit(el.props.children)
  }
  visit(node)
  return count
}

vi.mock('@/components/ui/chart', () => {
  return {
    ChartConfig: {} as Record<string, unknown>,
    ChartContainer: ({
      children,
      config,
    }: {
      children?: React.ReactNode
      config?: Record<string, { label?: unknown; color?: string }>
    }) => {
      mockState.containerConfigs.push({ config: config ?? {} })
      return <div data-testid="chart-container">{children}</div>
    },
    ChartTooltip: () => null,
    ChartTooltipContent: () => null,
    ChartLegend: () => {
      mockState.chartLegendRenders += 1
      return null
    },
    ChartLegendContent: () => null,
  }
})

const series = [
  { key: 'Ventes', label: 'Ventes' },
  { key: 'Achats', label: 'Achats' },
  { key: 'Marge', label: 'Marge Brute' },
]

const data = [
  { date: '2026-01-01', Ventes: 100, Achats: 60, Marge: 40 },
  { date: '2026-02-01', Ventes: 120, Achats: 70, Marge: 50 },
  { date: '2026-03-01', Ventes: 140, Achats: 80, Marge: 60 },
]

function renderChart() {
  return render(
    <InteractiveChartCard
      title="Évolution"
      data={data}
      series={series}
      chartType="area"
      enableTimeRangeSelector={false}
      enableChartTypeSelector={false}
    />,
  )
}

describe('InteractiveChartCard — A1g1 monochrome', () => {
  beforeEach(() => {
    mockState.areas.length = 0
    mockState.legends.length = 0
    mockState.chartLegendRenders = 0
    mockState.containerConfigs.length = 0
    mockState.linearGradients = 0
  })

  it('renders 3 Area series', async () => {
    renderChart()
    await waitFor(() => {
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    })
    expect(mockState.areas).toHaveLength(3)
  })

  it('uses the same --chart-1 accent color for every series (monochrome)', async () => {
    renderChart()
    await waitFor(() => {
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    })
    const fills = new Set(mockState.areas.map((a) => a.fill))
    const strokes = new Set(mockState.areas.map((a) => a.stroke))
    expect(fills.size).toBe(1)
    expect(strokes.size).toBe(1)
    expect([...fills][0]).toBe('hsl(var(--chart-1))')
    expect([...strokes][0]).toBe('hsl(var(--chart-1))')
  })

  it('applies 100% / 50% / 20% fillOpacity to the 3 series respectively', async () => {
    renderChart()
    await waitFor(() => {
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    })
    const byKey = Object.fromEntries(
      mockState.areas.map((a) => [a.dataKey, a.fillOpacity]),
    )
    expect(byKey.Ventes).toBe(1)
    expect(byKey.Achats).toBe(0.5)
    expect(byKey.Marge).toBe(0.2)
  })

  it('does not stack the Area series (no stackId)', async () => {
    renderChart()
    await waitFor(() => {
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    })
    for (const a of mockState.areas) {
      expect(a.stackId).toBeUndefined()
    }
  })

  it('does not render a <linearGradient> in the chart <defs>', async () => {
    renderChart()
    await waitFor(() => {
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    })
    expect(mockState.linearGradients).toBe(0)
  })

  it('does not render a ChartLegend', async () => {
    renderChart()
    await waitFor(() => {
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    })
    expect(mockState.chartLegendRenders).toBe(0)
  })

  it('chartConfig entries have no label (only color)', async () => {
    renderChart()
    await waitFor(() => {
      expect(screen.getByTestId('chart-container')).toBeInTheDocument()
    })
    expect(mockState.containerConfigs.length).toBeGreaterThan(0)
    const config = mockState.containerConfigs[0].config
    for (const key of ['Ventes', 'Achats', 'Marge']) {
      expect(config[key]).toBeDefined()
      expect(config[key].color).toBe('hsl(var(--chart-1))')
      expect(config[key].label).toBeUndefined()
    }
  })
})
