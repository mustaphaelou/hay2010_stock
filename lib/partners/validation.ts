import { z } from 'zod'

export const getPartnersSchema = z.object({
  type: z.enum(['CLIENT', 'FOURNISSEUR', 'LES_DEUX', 'all']).optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(50).optional()
})

export type GetPartnersInput = z.infer<typeof getPartnersSchema>
