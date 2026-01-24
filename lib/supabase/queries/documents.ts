import { createClient } from '@/lib/supabase/client'
import type { Document, LigneDocument, Partenaire, Produit } from '@/lib/supabase/types'

export type DocumentWithPartner = Document & { partenaires: Pick<Partenaire, 'nom_partenaire'> }
export type LigneDocumentWithProduct = LigneDocument & { produits: Pick<Produit, 'nom_produit' | 'code_produit'>, documents: Pick<Document, 'numero_document' | 'date_document' | 'type_document'> }

// Fetch all documents with partner name
export async function getDocuments() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('documents')
        .select(`
            *,
            partenaires (nom_partenaire)
        `)
        .order('date_document', { ascending: false })

    return { data: data as DocumentWithPartner[] | null, error }
}

// Fetch document lines (useful for stock movements)
export async function getStockMovements() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('lignes_documents')
        .select(`
            *,
            produits (nom_produit, code_produit),
            documents (numero_document, date_document, type_document)
        `)
        .order('id_ligne', { ascending: false })

    return { data: data as LigneDocumentWithProduct[] | null, error }
}

// Fetch revenue over time
export async function getRevenueStats() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('documents')
        .select('date_document, montant_ttc')
        .eq('type_document', 'FACTURE')
        .order('date_document', { ascending: true })

    if (error) return { data: null, error }

    // Group by month
    const revenueByMonth = data.reduce((acc, d) => {
        const date = new Date(d.date_document)
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        acc[month] = (acc[month] || 0) + (d.montant_ttc || 0)
        return acc
    }, {} as Record<string, number>)

    const chartData = Object.entries(revenueByMonth).map(([date, revenue]) => ({ date, revenue }))

    return { data: chartData, error: null }
}
