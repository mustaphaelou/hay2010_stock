import { z } from 'zod'
import { paginationSchema } from '@/lib/pagination'

export const getDocLinesSchema = z.object({
  docId: z.number().int().positive('Document ID must be a positive integer')
})

export const getDocumentsByAffaireSchema = z.object({
  code_affaire: z.string().min(1, 'Affaire code is required')
})

const optionalDate = z.string().min(1).transform(str => new Date(str)).optional()
const optionalNullableDate = z.string().min(1).transform(str => new Date(str)).nullable().optional()

export const documentCreateSchema = z.object({
  numero_document: z.string().min(1).max(50),
  type_document: z.string().min(1).max(30),
  domaine_document: z.string().max(10).default('VENTE').optional(),
  etat_document: z.string().max(30).default('Saisi').optional(),
  id_partenaire: z.number().int().positive(),
  nom_partenaire_snapshot: z.string().max(255).nullable().optional(),
  id_affaire: z.number().int().positive().nullable().optional(),
  numero_affaire: z.string().max(50).nullable().optional(),
  date_document: optionalDate,
  date_echeance: optionalNullableDate,
  date_livraison: optionalNullableDate,
  date_livraison_prevue: optionalNullableDate,
  montant_ht: z.number().default(0).optional(),
  montant_remise_total: z.number().default(0).optional(),
  montant_tva_total: z.number().default(0).optional(),
  montant_ttc: z.number().default(0).optional(),
  solde_du: z.number().default(0).optional(),
  code_devise: z.string().max(3).default('MAD').optional(),
  taux_change: z.number().positive().default(1).optional(),
  statut_document: z.string().max(20).default('BROUILLON').optional(),
  est_entierement_paye: z.boolean().default(false).optional(),
  id_entrepot: z.number().int().positive().nullable().optional(),
  notes_internes: z.string().nullable().optional(),
  notes_client: z.string().nullable().optional(),
  reference_externe: z.string().max(100).nullable().optional(),
  mode_expedition: z.string().max(50).nullable().optional(),
  poids_total_brut: z.number().positive().nullable().optional(),
  nombre_colis: z.number().int().positive().nullable().optional(),
})

export const documentUpdateSchema = documentCreateSchema.partial()

export const getDocumentByIdSchema = z.object({
  id_document: z.number().int().positive()
})

export const deleteDocumentSchema = z.object({
  id_document: z.number().int().positive()
})

export type GetDocLinesInput = z.infer<typeof getDocLinesSchema>
export type GetDocumentsByAffaireInput = z.infer<typeof getDocumentsByAffaireSchema>
export type DocumentCreateInput = z.infer<typeof documentCreateSchema>
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>

export type DocumentListParams = {
  page: number
  limit: number
  domaine?: string
  type_document?: string
  statut_document?: string
  id_partenaire?: number
  id_affaire?: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export const ALLOWED_DOCUMENT_SORT_FIELDS = [
  'id_document',
  'numero_document',
  'type_document',
  'domaine_document',
  'etat_document',
  'date_document',
  'montant_ht',
  'montant_ttc',
  'statut_document',
  'date_creation',
  'date_modification',
] as const

export type AllowedDocumentSortField = (typeof ALLOWED_DOCUMENT_SORT_FIELDS)[number]
