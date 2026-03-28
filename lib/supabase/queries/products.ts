'use server'

import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/app/actions/auth'

export type ProductData = {
  id_produit: number
  code_produit: string
  nom_produit: string
  id_categorie: number | null
  famille: string | null
  description_produit: string | null
  code_barre_ean: string | null
  unite_mesure: string
  poids_kg: number | null
  volume_m3: number | null
  prix_achat: number | null
  prix_dernier_achat: number | null
  coefficient: number | null
  prix_vente: number | null
  prix_gros: number | null
  taux_tva: number | null
  type_suivi_stock: string | null
  quantite_min_commande: number | null
  niveau_reappro_quantite: number | null
  stock_minimum: number | null
  stock_maximum: number | null
  activer_suivi_stock: boolean
  id_fournisseur_principal: number | null
  reference_fournisseur: string | null
  delai_livraison_fournisseur_jours: number | null
  est_actif: boolean
  en_sommeil: boolean
  est_abandonne: boolean
  date_creation: Date
  date_modification: Date
  cree_par: string | null
  modifie_par: string | null
  compte_general_vente: string | null
  compte_general_achat: string | null
  code_taxe_vente: string | null
  code_taxe_achat: string | null
  categories_produits?: { nom_categorie: string }
}

// Fetch all products
export async function getProducts() {
  await requireAuth()
  
  const data = await prisma.produit.findMany({
    include: {
      categorie: {
        select: { nom_categorie: true }
      }
    },
    orderBy: { nom_produit: 'asc' }
  })

  return { 
    data: data.map(p => ({
      ...p,
      poids_kg: p.poids_kg ? Number(p.poids_kg) : null,
      volume_m3: p.volume_m3 ? Number(p.volume_m3) : null,
      prix_achat: p.prix_achat ? Number(p.prix_achat) : null,
      prix_dernier_achat: p.prix_dernier_achat ? Number(p.prix_dernier_achat) : null,
      coefficient: p.coefficient ? Number(p.coefficient) : null,
      prix_vente: p.prix_vente ? Number(p.prix_vente) : null,
      prix_gros: p.prix_gros ? Number(p.prix_gros) : null,
      taux_tva: p.taux_tva ? Number(p.taux_tva) : null,
      categories_produits: p.categorie ? { nom_categorie: p.categorie.nom_categorie } : undefined
    })) as ProductData[], 
    error: null 
  }
}

// Fetch a single product by code
export async function getProductByCode(code: string) {
  await requireAuth()
  
  const data = await prisma.produit.findUnique({
    where: { code_produit: code },
    include: {
      categorie: {
        select: { nom_categorie: true }
      }
    }
  })

  if (!data) {
    return { data: null, error: { message: 'Product not found' } }
  }

  return { 
    data: {
      ...data,
      poids_kg: data.poids_kg ? Number(data.poids_kg) : null,
      volume_m3: data.volume_m3 ? Number(data.volume_m3) : null,
      prix_achat: data.prix_achat ? Number(data.prix_achat) : null,
      prix_dernier_achat: data.prix_dernier_achat ? Number(data.prix_dernier_achat) : null,
      coefficient: data.coefficient ? Number(data.coefficient) : null,
      prix_vente: data.prix_vente ? Number(data.prix_vente) : null,
      prix_gros: data.prix_gros ? Number(data.prix_gros) : null,
      taux_tva: data.taux_tva ? Number(data.taux_tva) : null,
      categories_produits: data.categorie ? { nom_categorie: data.categorie.nom_categorie } : undefined
    } as ProductData, 
    error: null 
  }
}

// Search products by name or code
export async function searchProducts(searchTerm: string) {
  await requireAuth()
  
  const data = await prisma.produit.findMany({
    where: {
      OR: [
        { nom_produit: { contains: searchTerm, mode: 'insensitive' } },
        { code_produit: { contains: searchTerm, mode: 'insensitive' } }
      ]
    },
    include: {
      categorie: {
        select: { nom_categorie: true }
      }
    }
  })

  return { 
    data: data.map(p => ({
      ...p,
      poids_kg: p.poids_kg ? Number(p.poids_kg) : null,
      volume_m3: p.volume_m3 ? Number(p.volume_m3) : null,
      prix_achat: p.prix_achat ? Number(p.prix_achat) : null,
      prix_dernier_achat: p.prix_dernier_achat ? Number(p.prix_dernier_achat) : null,
      coefficient: p.coefficient ? Number(p.coefficient) : null,
      prix_vente: p.prix_vente ? Number(p.prix_vente) : null,
      prix_gros: p.prix_gros ? Number(p.prix_gros) : null,
      taux_tva: p.taux_tva ? Number(p.taux_tva) : null,
      categories_produits: p.categorie ? { nom_categorie: p.categorie.nom_categorie } : undefined
    })) as ProductData[], 
    error: null 
  }
}

// Get products by category ID
export async function getProductsByCategory(categoryId: number) {
  await requireAuth()
  
  const data = await prisma.produit.findMany({
    where: { id_categorie: categoryId },
    include: {
      categorie: {
        select: { nom_categorie: true }
      }
    }
  })

  return { 
    data: data.map(p => ({
      ...p,
      poids_kg: p.poids_kg ? Number(p.poids_kg) : null,
      volume_m3: p.volume_m3 ? Number(p.volume_m3) : null,
      prix_achat: p.prix_achat ? Number(p.prix_achat) : null,
      prix_dernier_achat: p.prix_dernier_achat ? Number(p.prix_dernier_achat) : null,
      coefficient: p.coefficient ? Number(p.coefficient) : null,
      prix_vente: p.prix_vente ? Number(p.prix_vente) : null,
      prix_gros: p.prix_gros ? Number(p.prix_gros) : null,
      taux_tva: p.taux_tva ? Number(p.taux_tva) : null,
      categories_produits: p.categorie ? { nom_categorie: p.categorie.nom_categorie } : undefined
    })) as ProductData[], 
    error: null 
  }
}
