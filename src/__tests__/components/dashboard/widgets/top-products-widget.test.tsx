import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopProductsWidget, type TopProduct } from '@/components/dashboard/widgets/top-products-widget'

const ruptureProduct: TopProduct = {
  id: '1',
  name: 'Vis M6',
  category: 'Visserie',
  salesCount: 250,
  revenue: 12500,
  stockLevel: 0,
}

const basProduct: TopProduct = {
  id: '2',
  name: 'Boulon M8',
  category: 'Visserie',
  salesCount: 180,
  revenue: 9000,
  stockLevel: 3,
}

const enStockProduct: TopProduct = {
  id: '3',
  name: 'Rondelle M10',
  category: 'Visserie',
  salesCount: 420,
  revenue: 4200,
  stockLevel: 150,
}

describe('TopProductsWidget — A1r1 top produits panel', () => {
  it('renders one row per product with a data-testid marker', () => {
    render(
      <TopProductsWidget products={[ruptureProduct, basProduct, enStockProduct]} />,
    )

    const rows = screen.getAllByTestId('top-product-row')
    expect(rows).toHaveLength(3)
  })

  it('shows the product name and category in each row', () => {
    render(<TopProductsWidget products={[ruptureProduct]} />)

    expect(screen.getByText('Vis M6')).toBeInTheDocument()
    expect(screen.getByText('Visserie')).toBeInTheDocument()
  })

  it('formats the revenue with fr-MA locale (space thousands, no decimals) and MAD suffix', () => {
    const { container } = render(<TopProductsWidget products={[enStockProduct]} />)

    const revenue = container.querySelector(
      '[data-testid="top-product-row"] [data-slot="top-product-revenue"]',
    )
    expect(revenue).toBeInTheDocument()
    expect(revenue?.textContent).toMatch(/MAD/)
    expect(revenue?.textContent).not.toMatch(/\$/)
    // Locale-formatted 4 200 + MAD; ICU on jsdom may use a NARROW NO-BREAK SPACE
    // or a regular space as the thousands separator. Assert on the number
    // being formatted (not raw "4200") and the MAD suffix.
    expect(revenue?.textContent).not.toContain('4200')
    expect(revenue?.textContent).toMatch(/4[^\d]200\s*MAD/)
  })

  it('formats a large revenue with space thousands (e.g. 12 500 MAD)', () => {
    const { container } = render(<TopProductsWidget products={[ruptureProduct]} />)

    const revenue = container.querySelector(
      '[data-testid="top-product-row"] [data-slot="top-product-revenue"]',
    )
    expect(revenue?.textContent).not.toContain('12500')
    expect(revenue?.textContent).toMatch(/12[^\d]500\s*MAD/)
  })

  it('shows the units sold (salesCount) in each row', () => {
    const { container } = render(
      <TopProductsWidget products={[enStockProduct]} />,
    )

    const sold = container.querySelector(
      '[data-testid="top-product-row"] [data-slot="top-product-sales-count"]',
    )
    expect(sold).toBeInTheDocument()
    expect(sold?.textContent).toMatch(/420/)
  })

  it('shows the stock level in each row', () => {
    const { container } = render(
      <TopProductsWidget products={[basProduct]} />,
    )

    const stock = container.querySelector(
      '[data-testid="top-product-row"] [data-slot="top-product-stock-level"]',
    )
    expect(stock).toBeInTheDocument()
    expect(stock?.textContent).toMatch(/3/)
  })

  it('renders a "Rupture" status pill for products with stockLevel = 0', () => {
    const { container } = render(
      <TopProductsWidget products={[ruptureProduct]} />,
    )

    const pill = container.querySelector(
      '[data-testid="top-product-row"][data-stock-status="rupture"] [data-slot="top-product-status-pill"]',
    )
    expect(pill).toBeInTheDocument()
    expect(pill?.textContent).toMatch(/rupture/i)
  })

  it('renders a "Bas" status pill for products with stockLevel below the threshold', () => {
    const { container } = render(
      <TopProductsWidget products={[basProduct]} />,
    )

    const pill = container.querySelector(
      '[data-testid="top-product-row"][data-stock-status="bas"] [data-slot="top-product-status-pill"]',
    )
    expect(pill).toBeInTheDocument()
    expect(pill?.textContent).toMatch(/bas/i)
  })

  it('renders an "En stock" status pill for products with stockLevel above the threshold', () => {
    const { container } = render(
      <TopProductsWidget products={[enStockProduct]} />,
    )

    const pill = container.querySelector(
      '[data-testid="top-product-row"][data-stock-status="en-stock"] [data-slot="top-product-status-pill"]',
    )
    expect(pill).toBeInTheDocument()
    expect(pill?.textContent).toMatch(/en stock/i)
  })

  it('does not render a star icon, rating, or rating number', () => {
    const productWithRating: TopProduct = {
      ...ruptureProduct,
      rating: 4.5,
    }
    const { container } = render(
      <TopProductsWidget products={[productWithRating]} />,
    )

    // No <svg> chart/sparkline polyline; the avatar icon is fine to allow.
    const sparkline = container.querySelector(
      '[data-testid="top-product-row"] svg polyline',
    )
    expect(sparkline).not.toBeInTheDocument()

    // No rating number rendered.
    expect(screen.queryByText('4.5')).not.toBeInTheDocument()
    // No trend percent rendered.
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('does not render a trend arrow, trend percent, or sparkline when trend fields are present', () => {
    const productWithTrend: TopProduct = {
      ...ruptureProduct,
      trend: 12.3,
      trendDirection: 'up',
      miniChartData: [1, 2, 3, 4, 5],
    }
    const { container } = render(
      <TopProductsWidget products={[productWithTrend]} />,
    )

    const sparkline = container.querySelector(
      '[data-testid="top-product-row"] svg polyline',
    )
    expect(sparkline).not.toBeInTheDocument()
    expect(screen.queryByText(/12\.3/)).not.toBeInTheDocument()
  })

  it('does not render a $ currency prefix anywhere', () => {
    render(
      <TopProductsWidget
        products={[ruptureProduct, basProduct, enStockProduct]}
      />,
    )

    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\$/)
  })

  it('truncates the list to a maximum of maxItems rows', () => {
    const manyProducts: TopProduct[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(100 + i),
      name: `Produit ${i}`,
      category: 'Cat',
      salesCount: 10,
      revenue: 100,
      stockLevel: 50,
    }))

    render(<TopProductsWidget products={manyProducts} maxItems={5} />)

    expect(screen.getAllByTestId('top-product-row')).toHaveLength(5)
  })

  it('respects a custom maxItems override', () => {
    const manyProducts: TopProduct[] = Array.from({ length: 6 }, (_, i) => ({
      id: String(200 + i),
      name: `Produit ${i}`,
      category: 'Cat',
      salesCount: 10,
      revenue: 100,
      stockLevel: 50,
    }))

    render(<TopProductsWidget products={manyProducts} maxItems={3} />)

    expect(screen.getAllByTestId('top-product-row')).toHaveLength(3)
  })

  it('renders a "Voir tout" link pointing to /sales?filter=top', () => {
    render(
      <TopProductsWidget products={[ruptureProduct, basProduct]} />,
    )

    const link = screen.getByRole('link', { name: /voir tout/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/sales?filter=top')
  })

  it('hides the "Voir tout" link when there are no products', () => {
    render(<TopProductsWidget products={[]} />)

    expect(screen.queryByRole('link', { name: /voir tout/i })).not.toBeInTheDocument()
  })

  it('renders a monochrome empty state when no products are provided', () => {
    const { container } = render(<TopProductsWidget products={[]} />)

    const empty = container.querySelector('[data-slot="top-products-empty"]')
    expect(empty).toBeInTheDocument()
    expect(screen.getByText(/aucun produit/i)).toBeInTheDocument()
  })

  it('renders a skeleton state when loading is true', () => {
    const { container } = render(
      <TopProductsWidget products={[]} loading />,
    )

    expect(
      container.querySelector('[data-slot="top-products-skeleton"]'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('top-product-row')).not.toBeInTheDocument()
  })
})
