import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Type guard to check if a value is a valid Hugeicons icon (IconSvgElement)
 * IconSvgElement is a readonly array of readonly [string, object] tuples
 */
export function isValidIcon(icon: unknown): icon is readonly (readonly [string, { [key: string]: string | number }])[] {
  return Array.isArray(icon) && icon.length > 0 && icon.every(
    item => Array.isArray(item) && item.length === 2 && typeof item[0] === 'string' && typeof item[1] === 'object'
  )
}

const currencyFormatter = new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',
  minimumFractionDigits: 2
})

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '-'
  return currencyFormatter.format(price).replace('MAD', 'Dhs')
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return dateFormatter.format(d)
}

const quantityFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 2
})

export function formatQuantity(qty: number | null | undefined): string {
  if (qty === null || qty === undefined) return '-'
  return quantityFormatter.format(qty)
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `il y a ${diffMins} min`
  if (diffHours < 24) return `il y a ${diffHours} h`
  if (diffDays < 7) return `il y a ${diffDays} j`

  return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
}
