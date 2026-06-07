import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { createCrudService } from '@/lib/crud-service'
import type { CrudDelegate, CrudService } from '@/lib/crud-service'

interface TestRecord {
  id: number
  name: string
  email: string
  cree_par?: string
  modifie_par?: string
}

interface TestCreate {
  name: string
  email: string
}

interface TestUpdate {
  name?: string
  email?: string | null
}

const createSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
})

const updateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').optional(),
  email: z.string().email('Email invalide').nullable().optional(),
})

function createMockDelegate(): CrudDelegate<TestRecord, TestCreate, TestUpdate> {
  return {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  }
}

function createService(
  delegate?: CrudDelegate<TestRecord, TestCreate, TestUpdate>,
  overrides?: Partial<{
    entityName: string
    uniqueFields: string[]
    idField: string
    userIdField: string
  }>,
): {
  service: CrudService<TestRecord, TestCreate, TestUpdate>
  delegate: CrudDelegate<TestRecord, TestCreate, TestUpdate>
} {
  const mockDelegate = delegate ?? createMockDelegate()
  const service = createCrudService<TestRecord, TestCreate, TestUpdate>({
    delegate: mockDelegate,
    entityName: overrides?.entityName ?? 'Test',
    createSchema,
    updateSchema,
    uniqueFields: overrides?.uniqueFields,
    idField: overrides?.idField,
    userIdField: overrides?.userIdField,
  })
  return { service, delegate: mockDelegate }
}

const sampleRecord: TestRecord = { id: 1, name: 'Test', email: 'test@example.com' }

function prismaError(code: 'P2002' | 'P2003' | 'P2025', message?: string): Error {
  const defaultMessage =
    code === 'P2002' ? 'Unique constraint failed on the fields: (`email`)'
    : code === 'P2003' ? 'Foreign key constraint failed on the field'
    : 'An operation failed because it depends on one or more records that were required but not found.'
  const err = new Error(message ?? defaultMessage) as Error & { code: string; clientVersion: string }
  err.code = code
  err.clientVersion = 'test'
  return err
}

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('createCrudService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('creates a record with valid data', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.create).mockResolvedValue(sampleRecord)

      const result = await service.create({ name: 'Test', email: 'test@example.com' })

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(sampleRecord)
      expect(delegate.create).toHaveBeenCalledWith({ data: { name: 'Test', email: 'test@example.com' } })
    })

    it('returns VALIDATION error when create data is invalid', async () => {
      const { service } = createService()

      const result = await service.create({ name: '', email: 'not-an-email' })

      expect(result.error).toBeDefined()
      expect(result.code).toBe('VALIDATION')
      expect(result.data).toBeUndefined()
    })

    it('returns CONFLICT when unique field already exists', async () => {
      const { service, delegate } = createService(undefined, { uniqueFields: ['email'] })
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)

      const result = await service.create({ name: 'Test', email: 'test@example.com' })

      expect(result.error).toContain('existe déjà')
      expect(result.code).toBe('CONFLICT')
      expect(result.data).toBeUndefined()
      expect(delegate.create).not.toHaveBeenCalled()
    })

    it('does not check uniqueness when unique field value is null', async () => {
      const { service, delegate } = createService(undefined, { uniqueFields: ['email'] })
      vi.mocked(delegate.findUnique).mockResolvedValue(null)
      vi.mocked(delegate.create).mockResolvedValue(sampleRecord)

      const result = await service.create({ name: 'Test', email: 'test@example.com' })

      expect(result.error).toBeUndefined()
      expect(delegate.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } })
      expect(delegate.create).toHaveBeenCalled()
    })

    it('returns INTERNAL error when delegate.create throws', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.create).mockRejectedValue(new Error('DB error'))

      const result = await service.create({ name: 'Test', email: 'test@example.com' })

      expect(result.error).toBeDefined()
      expect(result.code).toBe('INTERNAL')
      expect(result.data).toBeUndefined()
    })

    it('injects userId into delegate data when userIdField is configured', async () => {
      const { service, delegate } = createService(undefined, { userIdField: 'cree_par' })
      vi.mocked(delegate.create).mockResolvedValue({ ...sampleRecord, cree_par: 'user-1' })

      const result = await service.create({ name: 'Test', email: 'test@example.com' }, 'user-1')

      expect(result.error).toBeUndefined()
      expect(delegate.create).toHaveBeenCalledWith({ data: { name: 'Test', email: 'test@example.com', cree_par: 'user-1' } })
    })

    it('does not inject userId when userIdField is configured but no userId passed', async () => {
      const { service, delegate } = createService(undefined, { userIdField: 'cree_par' })
      vi.mocked(delegate.create).mockResolvedValue(sampleRecord)

      await service.create({ name: 'Test', email: 'test@example.com' })

      expect(delegate.create).toHaveBeenCalledWith({ data: { name: 'Test', email: 'test@example.com' } })
    })

    it('does not inject userId when userIdField is not configured even if userId is passed', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.create).mockResolvedValue(sampleRecord)

      await service.create({ name: 'Test', email: 'test@example.com' }, 'user-1')

      expect(delegate.create).toHaveBeenCalledWith({ data: { name: 'Test', email: 'test@example.com' } })
    })
  })

  describe('update', () => {
    it('updates a record with valid data', async () => {
      const { service, delegate } = createService()
      const updatedRecord: TestRecord = { id: 1, name: 'Updated', email: 'updated@example.com' }
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)
      vi.mocked(delegate.update).mockResolvedValue(updatedRecord)

      const result = await service.update(1, { name: 'Updated', email: 'updated@example.com' })

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(updatedRecord)
      expect(delegate.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Updated', email: 'updated@example.com' } })
    })

    it('returns NOT_FOUND when record does not exist', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(null)

      const result = await service.update(999, { name: 'Updated' })

      expect(result.error).toContain('introuvable')
      expect(result.code).toBe('NOT_FOUND')
      expect(result.data).toBeUndefined()
      expect(delegate.update).not.toHaveBeenCalled()
    })

    it('returns VALIDATION error when update data is invalid', async () => {
      const { service } = createService()

      const result = await service.update(1, { email: 'not-an-email' })

      expect(result.error).toBeDefined()
      expect(result.code).toBe('VALIDATION')
      expect(result.data).toBeUndefined()
    })

    it('returns INTERNAL error when delegate.update throws', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)
      vi.mocked(delegate.update).mockRejectedValue(new Error('DB error'))

      const result = await service.update(1, { name: 'Updated' })

      expect(result.error).toBeDefined()
      expect(result.code).toBe('INTERNAL')
    })

    it('returns CONFLICT when update changes unique field to a value taken by another record', async () => {
      const { service, delegate } = createService(undefined, { uniqueFields: ['email'] })
      const otherRecord: TestRecord = { id: 2, name: 'Other', email: 'taken@example.com' }
      vi.mocked(delegate.findUnique)
        .mockResolvedValueOnce(sampleRecord)
        .mockResolvedValueOnce(otherRecord)

      const result = await service.update(1, { email: 'taken@example.com' })

      expect(result.code).toBe('CONFLICT')
      expect(result.error).toContain('existe déjà')
      expect(result.data).toBeUndefined()
      expect(delegate.update).not.toHaveBeenCalled()
      expect(delegate.findUnique).toHaveBeenCalledTimes(2)
      expect(delegate.findUnique).toHaveBeenNthCalledWith(1, { where: { id: 1 } })
      expect(delegate.findUnique).toHaveBeenNthCalledWith(2, { where: { email: 'taken@example.com' } })
    })

    it('does not return CONFLICT when update keeps the same unique value', async () => {
      const { service, delegate } = createService(undefined, { uniqueFields: ['email'] })
      vi.mocked(delegate.findUnique).mockResolvedValueOnce(sampleRecord)
      vi.mocked(delegate.update).mockResolvedValue(sampleRecord)

      const result = await service.update(1, { email: 'test@example.com' })

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(sampleRecord)
      expect(delegate.findUnique).toHaveBeenCalledTimes(1)
      expect(delegate.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { email: 'test@example.com' } })
    })

    it('does not check uniqueness when the new unique field value is null', async () => {
      const { service, delegate } = createService(undefined, { uniqueFields: ['email'] })
      vi.mocked(delegate.findUnique).mockResolvedValueOnce(sampleRecord)
      vi.mocked(delegate.update).mockResolvedValue(sampleRecord)

      const result = await service.update(1, { email: null })

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(sampleRecord)
      expect(delegate.findUnique).toHaveBeenCalledTimes(1)
      expect(delegate.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { email: null } })
    })

    it('injects userId into delegate data on update when userIdField is configured', async () => {
      const { service, delegate } = createService(undefined, { userIdField: 'modifie_par' })
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)
      vi.mocked(delegate.update).mockResolvedValue({ ...sampleRecord, modifie_par: 'user-1' })

      const result = await service.update(1, { name: 'Updated' }, 'user-1')

      expect(result.error).toBeUndefined()
      expect(delegate.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Updated', modifie_par: 'user-1' } })
    })

    it('does not inject userId on update when userIdField is configured but no userId passed', async () => {
      const { service, delegate } = createService(undefined, { userIdField: 'modifie_par' })
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)
      vi.mocked(delegate.update).mockResolvedValue(sampleRecord)

      await service.update(1, { name: 'Updated' })

      expect(delegate.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Updated' } })
    })
  })

  describe('delete', () => {
    it('deletes a record that exists', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)
      vi.mocked(delegate.delete).mockResolvedValue()

      const result = await service.delete(1)

      expect(result.error).toBeUndefined()
      expect(result.data).toBeUndefined()
      expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('returns NOT_FOUND when record does not exist', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(null)

      const result = await service.delete(999)

      expect(result.error).toContain('introuvable')
      expect(result.code).toBe('NOT_FOUND')
      expect(delegate.delete).not.toHaveBeenCalled()
    })

    it('returns INTERNAL error when delegate.delete throws', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)
      vi.mocked(delegate.delete).mockRejectedValue(new Error('DB error'))

      const result = await service.delete(1)

      expect(result.error).toBeDefined()
      expect(result.code).toBe('INTERNAL')
    })
  })

  describe('getById', () => {
    it('returns a record when found', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)

      const result = await service.getById(1)

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(sampleRecord)
    })

    it('returns null when record is not found', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(null)

      const result = await service.getById(999)

      expect(result.error).toBeUndefined()
      expect(result.data).toBeNull()
    })

    it('returns INTERNAL error when delegate.findUnique throws', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockRejectedValue(new Error('DB error'))

      const result = await service.getById(1)

      expect(result.error).toBeDefined()
      expect(result.code).toBe('INTERNAL')
    })
  })

  describe('list', () => {
    it('returns all records when no params given', async () => {
      const { service, delegate } = createService()
      const records: TestRecord[] = [sampleRecord, { id: 2, name: 'Test 2', email: 'test2@example.com' }]
      vi.mocked(delegate.findMany).mockResolvedValue(records)

      const result = await service.list()

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(records)
      expect(delegate.findMany).toHaveBeenCalledWith({ where: undefined, orderBy: undefined, skip: 0, take: 50 })
    })

    it('passes pagination params correctly', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findMany).mockResolvedValue([])

      await service.list({ page: 3, limit: 20 })

      expect(delegate.findMany).toHaveBeenCalledWith({ where: undefined, orderBy: undefined, skip: 40, take: 20 })
    })

    it('passes where and orderBy filters', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findMany).mockResolvedValue([])

      await service.list({ where: { name: 'Test' }, orderBy: { name: 'asc' } })

      expect(delegate.findMany).toHaveBeenCalledWith({
        where: { name: 'Test' },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 50,
      })
    })

    it('returns INTERNAL error when delegate.findMany throws', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findMany).mockRejectedValue(new Error('DB error'))

      const result = await service.list()

      expect(result.error).toBeDefined()
      expect(result.code).toBe('INTERNAL')
    })
  })

  describe('ensureExists', () => {
    it('returns the record when it exists', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)

      const result = await service.ensureExists(1)

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(sampleRecord)
    })

    it('returns NOT_FOUND when record does not exist', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(null)

      const result = await service.ensureExists(999)

      expect(result.error).toContain('introuvable')
      expect(result.code).toBe('NOT_FOUND')
      expect(result.data).toBeUndefined()
    })

    it('returns INTERNAL error when delegate.findUnique throws', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockRejectedValue(new Error('DB error'))

      const result = await service.ensureExists(1)

      expect(result.error).toBeDefined()
      expect(result.code).toBe('INTERNAL')
    })
  })

  describe('Prisma error mapping', () => {
    it('maps P2002 thrown by delegate.create to CONFLICT', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.create).mockRejectedValue(prismaError('P2002'))

      const result = await service.create({ name: 'Test', email: 'test@example.com' })

      expect(result.code).toBe('CONFLICT')
      expect(result.data).toBeUndefined()
    })

    it('maps P2002 thrown by delegate.create to CONFLICT even when uniqueFields pre-check passed', async () => {
      const { service, delegate } = createService(undefined, { uniqueFields: ['email'] })
      vi.mocked(delegate.findUnique).mockResolvedValue(null)
      vi.mocked(delegate.create).mockRejectedValue(prismaError('P2002'))

      const result = await service.create({ name: 'Test', email: 'test@example.com' })

      expect(result.code).toBe('CONFLICT')
    })

    it('maps P2003 thrown by delegate.create to VALIDATION', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.create).mockRejectedValue(prismaError('P2003'))

      const result = await service.create({ name: 'Test', email: 'test@example.com' })

      expect(result.code).toBe('VALIDATION')
    })

    it('maps P2002 thrown by delegate.update to CONFLICT', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)
      vi.mocked(delegate.update).mockRejectedValue(prismaError('P2002'))

      const result = await service.update(1, { email: 'dup@example.com' })

      expect(result.code).toBe('CONFLICT')
    })

    it('maps P2025 thrown by delegate.update to NOT_FOUND (race after findUnique)', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)
      vi.mocked(delegate.update).mockRejectedValue(prismaError('P2025'))

      const result = await service.update(1, { name: 'Updated' })

      expect(result.code).toBe('NOT_FOUND')
    })

    it('maps P2025 thrown by delegate.delete to NOT_FOUND (race after findUnique)', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)
      vi.mocked(delegate.delete).mockRejectedValue(prismaError('P2025'))

      const result = await service.delete(1)

      expect(result.code).toBe('NOT_FOUND')
    })

    it('maps P2025 thrown by delegate.findUnique in getById to NOT_FOUND', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockRejectedValue(prismaError('P2025'))

      const result = await service.getById(1)

      expect(result.code).toBe('NOT_FOUND')
    })

    it('maps P2003 thrown by delegate.delete to VALIDATION (FK still referencing)', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockResolvedValue(sampleRecord)
      vi.mocked(delegate.delete).mockRejectedValue(prismaError('P2003'))

      const result = await service.delete(1)

      expect(result.code).toBe('VALIDATION')
    })

    it('maps P2002 thrown by delegate.findMany in list to CONFLICT', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findMany).mockRejectedValue(prismaError('P2002'))

      const result = await service.list()

      expect(result.code).toBe('CONFLICT')
    })

    it('maps P2025 thrown by delegate.findUnique in ensureExists to NOT_FOUND', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.findUnique).mockRejectedValue(prismaError('P2025'))

      const result = await service.ensureExists(1)

      expect(result.code).toBe('NOT_FOUND')
    })

    it('keeps INTERNAL behaviour for non-Prisma errors', async () => {
      const { service, delegate } = createService()
      vi.mocked(delegate.create).mockRejectedValue(new Error('Random DB failure'))

      const result = await service.create({ name: 'Test', email: 'test@example.com' })

      expect(result.code).toBe('INTERNAL')
    })
  })

  describe('custom idField', () => {
    it('uses custom idField in where clauses', async () => {
      const { service, delegate } = createService(undefined, { idField: 'code' })
      vi.mocked(delegate.findUnique).mockResolvedValue(null)

      await service.getById('ABC-123')

      expect(delegate.findUnique).toHaveBeenCalledWith({ where: { code: 'ABC-123' } })
    })
  })

  describe('custom entityName', () => {
    it('uses custom entityName in error messages', async () => {
      const { service, delegate } = createService(undefined, { entityName: 'Partenaire' })
      vi.mocked(delegate.findUnique).mockResolvedValue(null)

      const result = await service.ensureExists(999)

      expect(result.error).toContain('Partenaire introuvable')
    })
  })
})
