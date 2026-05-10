import { z } from 'zod'
import { paginationSchema } from '@/lib/pagination'

export const getAffairesSchema = paginationSchema.extend({
  type_affaire: z.string().max(30).optional(),
  statut_affaire: z.string().max(30).optional(),
  search: z.string().max(500).optional(),
  est_actif: z.boolean().optional(),
})

export const getAffaireByCodeSchema = z.object({
  code_affaire: z.string().min(1).max(50),
})

const optionalDate = z.string().min(1).transform(str => new Date(str)).optional()
const optionalNullableDate = z.string().min(1).transform(str => new Date(str)).nullable().optional()

export const affaireCreateSchema = z.object({
  code_affaire: z.string().min(1).max(50),
  intitule_affaire: z.string().min(1).max(500),
  type_affaire: z.string().max(30).default('Proposition').optional(),
  statut_affaire: z.string().max(30).default('En cours').optional(),
  abrege: z.string().max(100).nullable().optional(),
  id_client: z.number().int().positive().nullable().optional(),
  date_debut: optionalNullableDate,
  date_fin_prevue: optionalNullableDate,
  date_fin_reelle: optionalNullableDate,
  budget_prevu: z.number().positive().nullable().optional(),
  chiffre_affaires: z.number().default(0).optional(),
  marge: z.number().default(0).optional(),
  taux_remise_moyen: z.number().min(0).max(100).default(0).optional(),
  notes: z.string().nullable().optional(),
  est_actif: z.boolean().default(true).optional(),
  en_sommeil: z.boolean().default(false).optional(),
})

export const affaireUpdateSchema = affaireCreateSchema.partial()

export const getAffaireByIdSchema = z.object({
  id_affaire: z.number().int().positive(),
})

export const deleteAffaireSchema = z.object({
  id_affaire: z.number().int().positive(),
})

export type GetAffairesInput = z.infer<typeof getAffairesSchema>
export type GetAffaireByCodeInput = z.infer<typeof getAffaireByCodeSchema>
export type AffaireCreateInput = z.infer<typeof affaireCreateSchema>
export type AffaireUpdateInput = z.infer<typeof affaireUpdateSchema>

export const ALLOWED_AFFAIRE_SORT_FIELDS = [
  'id_affaire',
  'code_affaire',
  'intitule_affaire',
  'type_affaire',
  'statut_affaire',
  'budget_prevu',
  'chiffre_affaires',
  'date_creation',
  'date_modification',
] as const

export type AllowedAffaireSortField = (typeof ALLOWED_AFFAIRE_SORT_FIELDS)[number]
