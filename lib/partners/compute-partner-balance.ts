export function formatSoldeCourant(solde: number | null | undefined): string {
  if (solde === null || solde === undefined) return "0.00 Dhs"
  return `${solde} Dhs`
}

export function formatPlafondCredit(plafond: number | null | undefined): string {
  if (plafond === null || plafond === undefined) return "Non défini"
  return `${plafond} Dhs`
}
