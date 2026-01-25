import { createClient } from '@/lib/supabase/server'
import { PurchasesView } from '@/components/erp/purchases-view'

export default async function PurchasesPage() {
    const supabase = await createClient()

    const { data } = await supabase
        .from('f_docentete')
        .select(`*, f_comptet (ct_intitule)`)
        .eq('do_domaine', 1) // Purchases domain
        .order('do_date', { ascending: false })

    return <PurchasesView initialData={data as any || []} />
}
