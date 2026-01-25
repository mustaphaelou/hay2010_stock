import { createClient } from '@/lib/supabase/server'
import { DocumentsView } from '@/components/erp/documents-view'

export default async function DocumentsPage() {
    const supabase = await createClient()

    const { data } = await supabase
        .from('f_docentete')
        .select(`
            *,
            f_comptet (ct_intitule)
        `)
        .order('do_date', { ascending: false })

    return <DocumentsView initialData={data as any || []} />
}
