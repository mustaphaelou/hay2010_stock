import type { ZodType } from 'zod'
import { serviceError, validatedOrError } from '@/lib/service-result'
import type { ServiceResult } from '@/lib/service-result'
import { createLogger } from '@/lib/logger'

export interface CrudDelegate<TRecord, TCreate, TUpdate> {
  findUnique(args: { where: Record<string, unknown> }): Promise<TRecord | null>
  findMany(args?: { where?: Record<string, unknown>; orderBy?: Record<string, unknown>; skip?: number; take?: number }): Promise<TRecord[]>
  create(args: { data: TCreate }): Promise<TRecord>
  update(args: { where: Record<string, unknown>; data: TUpdate }): Promise<TRecord>
  delete(args: { where: Record<string, unknown> }): Promise<void>
  count(args?: { where?: Record<string, unknown> }): Promise<number>
}

export interface CrudConfig<TRecord, TCreate, TUpdate> {
  delegate: CrudDelegate<TRecord, TCreate, TUpdate>
  entityName: string
  createSchema: ZodType<TCreate>
  updateSchema: ZodType<TUpdate>
  uniqueFields?: string[]
  idField?: string
}

export interface CrudService<TRecord, TCreate, TUpdate> {
  create(input: TCreate): Promise<ServiceResult<TRecord>>
  update(id: number | string, input: TUpdate): Promise<ServiceResult<TRecord>>
  delete(id: number | string): Promise<ServiceResult<void>>
  getById(id: number | string): Promise<ServiceResult<TRecord | null>>
  list(params?: {
    page?: number
    limit?: number
    where?: Record<string, unknown>
    orderBy?: Record<string, unknown>
  }): Promise<ServiceResult<TRecord[]>>
  ensureExists(id: number | string): Promise<ServiceResult<TRecord>>
}

export function createCrudService<TRecord, TCreate, TUpdate>(
  config: CrudConfig<TRecord, TCreate, TUpdate>,
): CrudService<TRecord, TCreate, TUpdate> {
  const { delegate, entityName, createSchema, updateSchema, uniqueFields, idField = 'id' } = config
  const log = createLogger(`crud-${entityName.toLowerCase().replace(/\s+/g, '-')}`)

  function whereId(id: number | string): Record<string, unknown> {
    return { [idField]: id }
  }

  return {
    async create(input) {
      const parsed = validatedOrError(createSchema, input)
      if (parsed.error) {
        return { error: parsed.error, code: parsed.code }
      }

      const data = parsed.data

      try {
        if (uniqueFields && uniqueFields.length > 0) {
          for (const field of uniqueFields) {
            const val = (data as Record<string, unknown>)[field]
            if (val !== undefined && val !== null) {
              const existing = await delegate.findUnique({ where: { [field]: val } })
              if (existing) {
                return serviceError(
                  `Un ${entityName.toLowerCase()} avec ${field} '${String(val)}' existe déjà`,
                  'CONFLICT',
                )
              }
            }
          }
        }

        const record = await delegate.create({ data })
        return { data: record }
      } catch (error) {
        log.error({ error, input: data }, `Échec de la création de ${entityName.toLowerCase()}`)
        return serviceError(
          error instanceof Error ? error.message : `Échec de la création de ${entityName.toLowerCase()}`,
          'INTERNAL',
        )
      }
    },

    async update(id, input) {
      const parsed = validatedOrError(updateSchema, input)
      if (parsed.error) {
        return { error: parsed.error, code: parsed.code }
      }

      const data = parsed.data

      try {
        const existing = await delegate.findUnique({ where: whereId(id) })
        if (!existing) {
          return serviceError(`${entityName} introuvable`, 'NOT_FOUND')
        }

        const record = await delegate.update({ where: whereId(id), data })
        return { data: record }
      } catch (error) {
        log.error({ error, id, input: data }, `Échec de la mise à jour de ${entityName.toLowerCase()}`)
        return serviceError(
          error instanceof Error ? error.message : `Échec de la mise à jour de ${entityName.toLowerCase()}`,
          'INTERNAL',
        )
      }
    },

    async delete(id) {
      try {
        const existing = await delegate.findUnique({ where: whereId(id) })
        if (!existing) {
          return serviceError(`${entityName} introuvable`, 'NOT_FOUND')
        }

        await delegate.delete({ where: whereId(id) })
        return { data: undefined }
      } catch (error) {
        log.error({ error, id }, `Échec de la suppression de ${entityName.toLowerCase()}`)
        return serviceError(
          error instanceof Error ? error.message : `Échec de la suppression de ${entityName.toLowerCase()}`,
          'INTERNAL',
        )
      }
    },

    async getById(id) {
      try {
        const record = await delegate.findUnique({ where: whereId(id) })
        if (!record) {
          return { data: null }
        }
        return { data: record }
      } catch (error) {
        log.error({ error, id }, `Échec de la récupération de ${entityName.toLowerCase()}`)
        return serviceError(
          error instanceof Error ? error.message : `Échec de la récupération de ${entityName.toLowerCase()}`,
          'INTERNAL',
        )
      }
    },

    async list(params) {
      try {
        const { page = 1, limit = 50, where, orderBy } = params ?? {}
        const skip = (page - 1) * limit
        const records = await delegate.findMany({ where, orderBy, skip, take: limit })
        return { data: records }
      } catch (error) {
        log.error({ error, params }, `Échec de la liste de ${entityName.toLowerCase()}`)
        return serviceError(
          error instanceof Error ? error.message : `Échec de la liste de ${entityName.toLowerCase()}`,
          'INTERNAL',
        )
      }
    },

    async ensureExists(id) {
      try {
        const record = await delegate.findUnique({ where: whereId(id) })
        if (!record) {
          return serviceError(`${entityName} introuvable`, 'NOT_FOUND')
        }
        return { data: record }
      } catch (error) {
        log.error({ error, id }, `Échec de la vérification de ${entityName.toLowerCase()}`)
        return serviceError(
          error instanceof Error ? error.message : `Échec de la vérification de ${entityName.toLowerCase()}`,
          'INTERNAL',
        )
      }
    },
  }
}
