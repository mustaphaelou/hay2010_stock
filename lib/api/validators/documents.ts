import { z } from 'zod'

export const documentCreateSchema = z.object({
  numero_document: z.string().min(1).max(50),
  type_document: z.string().min(1).max(30),
  domaine_document: z.string().max(10).default('VENTE').optional(),
  etat_document: z.string().max(30).default('Saisi').optional(),
  id_partenaire: z.number().int().positive(),
  nom_partenaire_snapshot: z.string().max(255).nullable().optional(),
  id_affaire: z.number().int().positive().nullable().optional(),
  numero_affaire: z.string().max(50).nullable().optional(),
  date_document: z.string().optional(),
  date_echeance: z.string().nullable().optional(),
  date_livraison: z.string().nullable().optional(),
  date_livraison_prevue: z.string().nullable().optional(),
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

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type DocumentCreateInput = z.infer<typeof documentCreateSchema>
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
