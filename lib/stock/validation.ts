import { z } from 'zod'

export const createMovementSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  warehouseId: z.number().int().positive('Warehouse ID must be a positive integer'),
  quantity: z.number().positive('Quantity must be positive'),
  type: z.enum(['ENTREE', 'SORTIE', 'TRANSFERT', 'INVENTAIRE']),
  reference: z.string().max(255).optional(),
  motif: z.string().max(1000).optional(),
  destinationWarehouseId: z.number().int().positive().optional(),
})

export type CreateMovementInput = z.infer<typeof createMovementSchema>

export const createStockLevelSchema = z.object({
  productId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  quantite_en_stock: z.number().min(0).default(0).optional(),
  quantite_reservee: z.number().min(0).default(0).optional(),
  quantite_commandee: z.number().min(0).default(0).optional(),
})

export const adjustStockLevelSchema = z.object({
  productId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  newQuantity: z.number().min(0),
  motif: z.string().optional(),
})

export const deleteStockLevelSchema = z.object({
  id: z.number().int().positive(),
})
