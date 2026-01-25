import { createClient } from '@/lib/supabase/server'
import { AffairesView } from '@/components/erp/affaires-view'

export default async function AffairesPage() {
    const supabase = await createClient()

    const { data } = await supabase
        .from('f_docentete')
        .select('af_affaire')
        .not('af_affaire', 'is', null)
        .order('af_affaire')

    // Get unique affaires
    const uniqueAffaires = [...new Set(data?.map(d => d.af_affaire) || [])] as string[]

    return <AffairesView initialAffaires={uniqueAffaires} />
}
