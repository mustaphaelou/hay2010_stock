import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
