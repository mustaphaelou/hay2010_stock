import type { ZodType } from 'zod'
import { isServiceError, serviceError, validatedOrError } from '@/lib/service-result'
import type { ServiceResult } from '@/lib/service-result'
import { createLogger } from '@/lib/logger'
import { isUniqueConstraintError, isForeignKeyError, isPrismaNotFoundError } from '@/lib/errors'

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

  function mapError(
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage: string,
  ): ServiceResult<never> {
    if (isUniqueConstraintError(error)) {
      return serviceError(`Violation de contrainte d'unicité sur ${entityName.toLowerCase()}`, 'CONFLICT')
    }
    if (isForeignKeyError(error)) {
      return serviceError(`Référence invalide pour ${entityName.toLowerCase()}`, 'VALIDATION')
    }
    if (isPrismaNotFoundError(error)) {
      return serviceError(`${entityName} introuvable`, 'NOT_FOUND')
    }
    log.error({ error, ...context }, fallbackMessage)
    return serviceError(
      error instanceof Error ? error.message : fallbackMessage,
      'INTERNAL',
    )
  }

  return {
    async create(input) {
      const parsed = validatedOrError(createSchema, input)
      if (isServiceError(parsed)) {
        return parsed
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
        return mapError(error, { input: data }, `Échec de la création de ${entityName.toLowerCase()}`)
      }
    },

    async update(id, input) {
      const parsed = validatedOrError(updateSchema, input)
      if (isServiceError(parsed)) {
        return parsed
      }

      const data = parsed.data

      try {
        const existing = await delegate.findUnique({ where: whereId(id) })
        if (!existing) {
          return serviceError(`${entityName} introuvable`, 'NOT_FOUND')
        }

        if (uniqueFields && uniqueFields.length > 0) {
          for (const field of uniqueFields) {
            const newVal = (data as Record<string, unknown>)[field]
            if (newVal === undefined || newVal === null) continue
            const currentVal = (existing as Record<string, unknown>)[field]
            if (newVal === currentVal) continue
            const conflict = await delegate.findUnique({ where: { [field]: newVal } })
            if (conflict) {
              return serviceError(
                `Un ${entityName.toLowerCase()} avec ${field} '${String(newVal)}' existe déjà`,
                'CONFLICT',
              )
            }
          }
        }

        const record = await delegate.update({ where: whereId(id), data })
        return { data: record }
      } catch (error) {
        return mapError(error, { id, input: data }, `Échec de la mise à jour de ${entityName.toLowerCase()}`)
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
        return mapError(error, { id }, `Échec de la suppression de ${entityName.toLowerCase()}`)
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
        return mapError(error, { id }, `Échec de la récupération de ${entityName.toLowerCase()}`)
      }
    },

    async list(params) {
      try {
        const { page = 1, limit = 50, where, orderBy } = params ?? {}
        const skip = (page - 1) * limit
        const records = await delegate.findMany({ where, orderBy, skip, take: limit })
        return { data: records }
      } catch (error) {
        return mapError(error, { params }, `Échec de la liste de ${entityName.toLowerCase()}`)
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
        return mapError(error, { id }, `Échec de la vérification de ${entityName.toLowerCase()}`)
      }
    },
  }
}
