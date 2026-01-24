/**
 * Performance-optimized formatting utilities
 * Caches Intl.NumberFormat to avoid recreation on every call
 * Reference: js-cache-function-results best practice
 */

// Cached formatter - created once, reused forever
const currencyFormatter = new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2
})

/**
 * Format a number as Moroccan Dirhams (Dhs)
 * Uses cached Intl.NumberFormat for optimal performance
 */
export function formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined) return '-'
    return currencyFormatter.format(price).replace('MAD', 'Dhs')
}

// Date formatter cache
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
})

/**
 * Format a date string to French locale format
 * Uses cached Intl.DateTimeFormat for optimal performance
 */
export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return dateFormatter.format(d)
}

// Number formatter for quantities
const quantityFormatter = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2
})

/**
 * Format a quantity number with French locale formatting
 */
export function formatQuantity(qty: number | null | undefined): string {
    if (qty === null || qty === undefined) return '-'
    return quantityFormatter.format(qty)
}
