import { createClient } from '@/lib/supabase/server'
import { SalesView } from '@/components/erp/sales-view'

export default async function SalesPage() {
    const supabase = await createClient()

    const { data } = await supabase
        .from('f_docentete')
        .select(`*, f_comptet (ct_intitule)`)
        .eq('do_domaine', 0) // Sales domain
        .order('do_date', { ascending: false })

    return <SalesView initialData={data as any || []} />
}
