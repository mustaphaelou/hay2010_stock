import { z } from 'zod'

export const stockLevelCreateSchema = z.object({
  id_produit: z.number().int().positive(),
  id_entrepot: z.number().int().positive(),
  quantite_en_stock: z.number().default(0).optional(),
  quantite_reservee: z.number().default(0).optional(),
  quantite_commandee: z.number().default(0).optional(),
  date_dernier_mouvement: z.string().nullable().optional(),
  type_dernier_mouvement: z.string().max(50).nullable().optional(),
})

export const stockLevelUpdateSchema = stockLevelCreateSchema.partial()

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type StockLevelCreateInput = z.infer<typeof stockLevelCreateSchema>
export type StockLevelUpdateInput = z.infer<typeof stockLevelUpdateSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
