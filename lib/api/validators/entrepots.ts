import { z } from 'zod'

export const warehouseCreateSchema = z.object({
  code_entrepot: z.string().min(1).max(50),
  nom_entrepot: z.string().min(1).max(255),
  adresse_entrepot: z.string().nullable().optional(),
  ville_entrepot: z.string().max(100).nullable().optional(),
  code_postal_entrepot: z.string().max(20).nullable().optional(),
  capacite_totale_unites: z.number().int().positive().nullable().optional(),
  nom_responsable: z.string().max(255).nullable().optional(),
  email_responsable: z.string().email().max(255).nullable().optional(),
  telephone_responsable: z.string().max(50).nullable().optional(),
  est_actif: z.boolean().default(true).optional(),
  est_entrepot_principal: z.boolean().default(false).optional(),
})

export const warehouseUpdateSchema = warehouseCreateSchema.partial()

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type WarehouseCreateInput = z.infer<typeof warehouseCreateSchema>
export type WarehouseUpdateInput = z.infer<typeof warehouseUpdateSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
