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

export type GetAffairesInput = z.infer<typeof getAffairesSchema>
export type GetAffaireByCodeInput = z.infer<typeof getAffaireByCodeSchema>
