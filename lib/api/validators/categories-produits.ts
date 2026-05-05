import { z } from 'zod'
import { paginationSchema } from '@/lib/pagination'

export { paginationSchema }

export const categoryCreateSchema = z.object({
  code_categorie: z.string().min(1).max(50),
  nom_categorie: z.string().min(1).max(255),
  id_categorie_parent: z.number().int().positive().nullable().optional(),
  description_categorie: z.string().nullable().optional(),
  est_actif: z.boolean().default(true).optional(),
})

export const categoryUpdateSchema = categoryCreateSchema.partial()

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
