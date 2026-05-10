import { z } from 'zod'

export const toggleArticleStatusSchema = z.object({
  id_produit: z.number().int().positive('Product ID must be a positive integer'),
  newStatus: z.boolean()
})

export const createMovementSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  warehouseId: z.number().int().positive('Warehouse ID must be a positive integer'),
  quantity: z.number().positive('Quantity must be positive'),
  type: z.enum(['ENTREE', 'SORTIE', 'TRANSFERT', 'INVENTAIRE']),
  reference: z.string().max(255).optional(),
  motif: z.string().max(1000).optional(),
  destinationWarehouseId: z.number().int().positive().optional(),
})

export const articleCreateSchema = z.object({
  code_produit: z.string().min(1).max(100),
  nom_produit: z.string().min(1).max(500),
  id_categorie: z.number().int().positive().nullable().optional(),
  famille: z.string().max(100).nullable().optional(),
  description_produit: z.string().nullable().optional(),
  code_barre_ean: z.string().max(50).nullable().optional(),
  unite_mesure: z.string().max(20).default('U').optional(),
  poids_kg: z.number().positive().nullable().optional(),
  volume_m3: z.number().positive().nullable().optional(),
  prix_achat: z.number().positive().nullable().optional(),
  prix_dernier_achat: z.number().positive().nullable().optional(),
  coefficient: z.number().positive().default(1.0).optional(),
  prix_vente: z.number().positive().nullable().optional(),
  prix_gros: z.number().positive().nullable().optional(),
  taux_tva: z.number().min(0).max(100).default(20.00).optional(),
  type_suivi_stock: z.string().max(20).default('AUCUN').optional(),
  quantite_min_commande: z.number().int().positive().default(1).optional(),
  niveau_reappro_quantite: z.number().int().min(0).default(0).optional(),
  stock_minimum: z.number().int().min(0).default(0).optional(),
  stock_maximum: z.number().int().nullable().optional(),
  activer_suivi_stock: z.boolean().default(true).optional(),
  id_fournisseur_principal: z.number().int().positive().nullable().optional(),
  reference_fournisseur: z.string().max(100).nullable().optional(),
  delai_livraison_fournisseur_jours: z.number().int().positive().nullable().optional(),
  est_actif: z.boolean().default(true).optional(),
  en_sommeil: z.boolean().default(false).optional(),
  est_abandonne: z.boolean().default(false).optional(),
  compte_general_vente: z.string().max(20).nullable().optional(),
  compte_general_achat: z.string().max(20).nullable().optional(),
  code_taxe_vente: z.string().max(10).nullable().optional(),
  code_taxe_achat: z.string().max(10).nullable().optional(),
})

export const articleUpdateSchema = articleCreateSchema.partial()

export const getArticleByIdSchema = z.object({
  id_produit: z.number().int().positive(),
})

export const deleteArticleSchema = z.object({
  id_produit: z.number().int().positive(),
})

export const getStockLevelsByArticleSchema = z.object({
  id_produit: z.number().int().positive(),
})

export type ToggleArticleStatusInput = z.infer<typeof toggleArticleStatusSchema>
export type CreateMovementInput = z.infer<typeof createMovementSchema>
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>

export const ALLOWED_ARTICLE_SORT_FIELDS = [
  'id_produit',
  'code_produit',
  'nom_produit',
  'famille',
  'prix_vente',
  'prix_achat',
  'date_creation',
  'date_modification',
] as const

export type AllowedArticleSortField = (typeof ALLOWED_ARTICLE_SORT_FIELDS)[number]
