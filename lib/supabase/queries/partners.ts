import { createClient } from '@/lib/supabase/client'
import type { Partenaire } from '@/lib/supabase/types'

// Fetch all partners
export async function getPartners() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('partenaires')
        .select('*')
        .order('nom_partenaire', { ascending: true })

    return { data: data as Partenaire[] | null, error }
}

// Fetch partners by type
export async function getPartnersByType(type: 'CLIENT' | 'FOURNISSEUR') {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('partenaires')
        .select('*')
        .or(`type_partenaire.eq.${type},type_partenaire.eq.LES_DEUX`)
        .order('nom_partenaire', { ascending: true })

    return { data: data as Partenaire[] | null, error }
}

// Search partners by name or code
export async function searchPartners(searchTerm: string) {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('partenaires')
        .select('*')
        .or(`nom_partenaire.ilike.%${searchTerm}%,code_partenaire.ilike.%${searchTerm}%`)

    return { data: data as Partenaire[] | null, error }
}
