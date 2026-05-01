import { z } from 'zod'

export const affaireCreateSchema = z.object({
  code_affaire: z.string().min(1).max(50),
  intitule_affaire: z.string().min(1).max(500),
  type_affaire: z.string().max(30).default('Proposition').optional(),
  statut_affaire: z.string().max(30).default('En cours').optional(),
  abrege: z.string().max(100).nullable().optional(),
  id_client: z.number().int().positive().nullable().optional(),
  date_debut: z.string().nullable().optional(),
  date_fin_prevue: z.string().nullable().optional(),
  date_fin_reelle: z.string().nullable().optional(),
  budget_prevu: z.number().positive().nullable().optional(),
  chiffre_affaires: z.number().default(0).optional(),
  marge: z.number().default(0).optional(),
  taux_remise_moyen: z.number().min(0).max(100).default(0).optional(),
  notes: z.string().nullable().optional(),
  est_actif: z.boolean().default(true).optional(),
  en_sommeil: z.boolean().default(false).optional(),
})

export const affaireUpdateSchema = affaireCreateSchema.partial()

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type AffaireCreateInput = z.infer<typeof affaireCreateSchema>
export type AffaireUpdateInput = z.infer<typeof affaireUpdateSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
