import { createClient } from '@/lib/supabase/server'
import { StockView } from '@/components/erp/stock-view'

export default async function StockPage() {
    const supabase = await createClient()

    // Fetch stock levels with product and warehouse info
    const stockPromise = supabase
        .from('f_artstock')
        .select(`
            *,
            f_article (ar_design, ar_ref, ar_prixach),
            f_depot (de_intitule, de_no)
        `)
        .order('as_qtesto', { ascending: true })

    // Fetch warehouses for filter
    const depotsPromise = supabase
        .from('f_depot')
        .select('*')
        .eq('de_cloture', false)
        .order('de_intitule')

    const [stockRes, depotsRes] = await Promise.all([stockPromise, depotsPromise])

    return (
        <StockView
            initialStockLevels={stockRes.data as any || []}
            initialDepots={depotsRes.data || []}
        />
    )
}
