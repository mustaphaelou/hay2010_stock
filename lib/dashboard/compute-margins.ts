function toNumeric(value: number | { toNumber(): number }): number {
  return typeof value === 'number' ? value : value.toNumber()
}

export function computeGrossMargin(
  totalSalesAmount: number | null | undefined,
  totalPurchasesAmount: number | null | undefined
): number {
  return (totalSalesAmount ?? 0) - (totalPurchasesAmount ?? 0)
}

export function computeUnpaidInvoices(invoices: Array<{
  montant_ttc: number | { toNumber(): number }
  montant_regle: number
}>): { count: number; total: number } {
  let count = 0
  let total = 0
  for (const inv of invoices) {
    const ttc = toNumeric(inv.montant_ttc)
    const regle = Number(inv.montant_regle)
    if (regle < ttc) {
      count++
      total += ttc - regle
    }
  }
  return { count, total }
}

export function isPaymentComplete(
  montant_regle: number | null | undefined,
  montant_ttc: number | { toNumber(): number } | null | undefined
): boolean {
  return Number(montant_regle ?? 0) >= Number(montant_ttc ?? 0)
}
