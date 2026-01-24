import { createClient } from '@/lib/supabase/client'
import type { Produit } from '@/lib/supabase/types'

// Fetch all products
export async function getProducts() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('produits')
        .select(`
            *,
            categories_produits (nom_categorie)
        `)
        .order('nom_produit', { ascending: true })

    return { data: data as (Produit & { categories_produits: { nom_categorie: string } })[] | null, error }
}

// Fetch a single product by code
export async function getProductByCode(code: string) {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('produits')
        .select(`
            *,
            categories_produits (nom_categorie)
        `)
        .eq('code_produit', code)
        .single()

    return { data: data as (Produit & { categories_produits: { nom_categorie: string } }) | null, error }
}

// Search products by name or code
export async function searchProducts(searchTerm: string) {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('produits')
        .select(`
            *,
            categories_produits (nom_categorie)
        `)
        .or(`nom_produit.ilike.%${searchTerm}%,code_produit.ilike.%${searchTerm}%`)

    return { data: data as (Produit & { categories_produits: { nom_categorie: string } })[] | null, error }
}

// Get products by category ID
export async function getProductsByCategory(categoryId: number) {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('produits')
        .select(`
            *,
            categories_produits (nom_categorie)
        `)
        .eq('id_categorie', categoryId)

    return { data: data as (Produit & { categories_produits: { nom_categorie: string } })[] | null, error }
}
