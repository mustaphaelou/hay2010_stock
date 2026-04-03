import { getDashboardStats } from "@/app/actions/dashboard"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth/user-utils"
import { DashboardClient } from "./dashboard-client"
import type { DocumentWithComputed } from "@/lib/types"

export default async function Page() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const { stats, recentDocs, salesInvoices } = await getDashboardStats()
  
  const processedDocs: DocumentWithComputed[] = recentDocs.map(doc => ({
    ...doc,
    montant_ht_num: Number(doc.montant_ht),
    montant_ttc_num: Number(doc.montant_ttc),
    solde_du_num: Number(doc.solde_du),
    montant_regle: Number(doc.montant_ttc) - Number(doc.solde_du),
    numero_piece: doc.numero_document,
    nom_tiers: doc.nom_partenaire_snapshot,
    reference: doc.reference_externe,
    montant_tva_num: Number(doc.montant_tva_total),
    montant_remise_num: Number(doc.montant_remise_total),
    type_document_num: 0,
    statut_document_num: 0,
    domaine: doc.domaine_document
  }))

  return (
    <DashboardClient
      stats={stats}
      recentDocs={processedDocs}
      salesInvoices={salesInvoices}
    />
  )
}
