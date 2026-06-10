import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import type { NiveauStock } from '@/lib/generated/prisma/client'
import { createCrudService } from '@/lib/crud-service'
import type { CrudService } from '@/lib/crud-service'

export const niveauStockCreateSchema = z.object({
  id_produit: z.number().int().positive(),
  id_entrepot: z.number().int().positive(),
  quantite_en_stock: z.number().min(0).default(0).optional(),
  quantite_reservee: z.number().min(0).default(0).optional(),
  quantite_commandee: z.number().min(0).default(0).optional(),
})

export const niveauStockUpdateSchema = z.object({
  id_produit: z.number().int().positive().optional(),
  id_entrepot: z.number().int().positive().optional(),
  quantite_en_stock: z.number().min(0).optional(),
  quantite_reservee: z.number().min(0).optional(),
  quantite_commandee: z.number().min(0).optional(),
})

type CreateInput = z.infer<typeof niveauStockCreateSchema>
type UpdateInput = z.infer<typeof niveauStockUpdateSchema>

export type NiveauStockService = CrudService<NiveauStock, CreateInput, UpdateInput>

export const niveauStockService = createCrudService<NiveauStock, CreateInput, UpdateInput>({
  delegate: prisma.niveauStock as any,
  entityName: 'Niveau de stock',
  createSchema: niveauStockCreateSchema,
  updateSchema: niveauStockUpdateSchema,
  uniqueFields: [['id_produit', 'id_entrepot']],
  idField: 'id_stock',
  conflictFormatter: () => 'Un niveau de stock existe déjà pour ce couple produit-entrepôt',
})
