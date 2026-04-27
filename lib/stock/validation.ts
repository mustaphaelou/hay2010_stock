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

export type ToggleArticleStatusInput = z.infer<typeof toggleArticleStatusSchema>
export type CreateMovementInput = z.infer<typeof createMovementSchema>
