import { prisma } from '@/lib/db/prisma'
import {
  getAffairesSchema,
  getAffaireByCodeSchema,
  affaireCreateSchema,
  affaireUpdateSchema,
  ALLOWED_AFFAIRE_SORT_FIELDS,
} from '@/lib/affaires/validation'
import type {
  GetAffairesInput,
  AffaireCreateInput,
  AffaireUpdateInput,
  AllowedAffaireSortField,
} from '@/lib/affaires/validation'
import type { AffaireWithComputed, DocumentBase } from '@/lib/types'
import { createLogger } from '@/lib/logger'
import { createEmptyResult, buildPaginationMeta, getPaginationParams } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'
import { serviceError, validatedOrError } from '@/lib/service-result'
import type { ServiceResult, ServiceErrorCode } from '@/lib/service-result'
import { createCrudService } from '@/lib/crud-service'
import type { Affaire } from '@/lib/generated/prisma/client'

const log = createLogger('affaire-service')

function mapAffaireToComputed(affaire: Record<string, unknown>): AffaireWithComputed {
  return {
    id_affaire: affaire.id_affaire as number,
    code_affaire: affaire.code_affaire as string,
    intitule_affaire: affaire.intitule_affaire as string,
    type_affaire: affaire.type_affaire as string,
    statut_affaire: affaire.statut_affaire as string | null,
    abrege: affaire.abrege as string | null,
    id_client: affaire.id_client as number | null,
    date_debut: affaire.date_debut as Date | null,
    date_fin_prevue: affaire.date_fin_prevue as Date | null,
    date_fin_reelle: affaire.date_fin_reelle as Date | null,
    budget_prevu: affaire.budget_prevu as never,
    chiffre_affaires: affaire.chiffre_affaires as never,
    marge: affaire.marge as never,
    taux_remise_moyen: affaire.taux_remise_moyen as never,
    notes: affaire.notes as string | null,
    est_actif: affaire.est_actif as boolean,
    en_sommeil: affaire.en_sommeil as boolean,
    date_creation: affaire.date_creation as Date,
    date_modification: affaire.date_modification as Date,
    cree_par: affaire.cree_par as string | null,
    modifie_par: affaire.modifie_par as string | null,
    client: affaire.client as AffaireWithComputed['client'],
    budget_prevu_num: Number(affaire.budget_prevu ?? 0),
    chiffre_affaires_num: Number(affaire.chiffre_affaires ?? 0),
    marge_num: Number(affaire.marge ?? 0),
  }
}

const baseCrud = createCrudService<Affaire, AffaireCreateInput, AffaireUpdateInput>({
  delegate: prisma.affaire as any,
  entityName: 'Affaire',
  createSchema: affaireCreateSchema,
  updateSchema: affaireUpdateSchema,
  uniqueFields: ['code_affaire'],
  idField: 'id_affaire',
  createUserIdField: 'cree_par',
  updateUserIdField: 'modifie_par',
  conflictFormatter: (field, value) => `L'affaire ${value} existe déjà`,
  softDelete: { field: 'est_actif', value: false, userIdField: 'modifie_par' },
})

// --- Standard CRUD via CrudService ---

export const ensureAffaireExists = baseCrud.ensureExists

// --- Custom list with filters, search, sort, pagination ---

export async function getAffaires(
  page: number = 1,
  limit: number = 50,
  filters?: Partial<GetAffairesInput>,
  sort: string = 'date_creation',
  order: 'asc' | 'desc' = 'desc',
): Promise<PaginatedResult<AffaireWithComputed> & { error?: string; code?: ServiceErrorCode }> {
  const result = validatedOrError(getAffairesSchema, { page, limit, ...filters }, { message: 'Paramètres de filtre invalides' })
  if (result.error || !result.data) {
    const errorMsg = result.error || 'Paramètres de filtre invalides'
    return { ...createEmptyResult<AffaireWithComputed>(page, limit, errorMsg), error: errorMsg, code: result.code || 'VALIDATION' }
  }

  const validated = result.data
  const { skip } = getPaginationParams({ page: validated.page, limit: validated.limit })

  const effectiveSort = ALLOWED_AFFAIRE_SORT_FIELDS.includes(sort as AllowedAffaireSortField)
    ? (sort as AllowedAffaireSortField)
    : 'date_creation'

  try {
    const where: Record<string, unknown> = {}
    if (validated.type_affaire) where.type_affaire = validated.type_affaire
    if (validated.statut_affaire) where.statut_affaire = validated.statut_affaire
    if (validated.est_actif !== undefined) where.est_actif = validated.est_actif
    if (validated.search) {
      where.OR = [
        { code_affaire: { contains: validated.search, mode: 'insensitive' } },
        { intitule_affaire: { contains: validated.search, mode: 'insensitive' } },
      ]
    }

    const [affaires, total] = await Promise.all([
      prisma.affaire.findMany({
        skip,
        take: validated.limit,
        where,
        include: {
          client: { select: { nom_partenaire: true, code_partenaire: true, type_partenaire: true } },
        },
        orderBy: { [effectiveSort]: order },
      }),
      prisma.affaire.count({ where }),
    ])

    return {
      data: affaires.map((a) => mapAffaireToComputed(a as unknown as Record<string, unknown>)),
      meta: buildPaginationMeta(total, validated.page, validated.limit),
    }
  } catch (error) {
    log.error({ error }, 'Échec de la récupération des affaires')
    return { ...createEmptyResult<AffaireWithComputed>(page, limit, 'Échec de la récupération des affaires'), ...serviceError('Échec de la récupération des affaires', 'INTERNAL') }
  }
}

// --- Wrap CrudService getById ---

export async function getAffaireById(id_affaire: number): Promise<ServiceResult<AffaireWithComputed>> {
  const result = await baseCrud.getById(id_affaire)
  if (!result.error && result.data === null) {
    return serviceError('Affaire introuvable', 'NOT_FOUND')
  }
  if (result.data) {
    return { data: mapAffaireToComputed(result.data as unknown as Record<string, unknown>) }
  }
  return result as ServiceResult<AffaireWithComputed>
}

// --- Create via CrudService (validation, unique check, userId injection handled) ---

export async function createAffaire(
  input: AffaireCreateInput,
  userId: string,
): Promise<ServiceResult<AffaireWithComputed>> {
  const result = await baseCrud.create(input, userId)
  if (result.error) {
    return result as ServiceResult<AffaireWithComputed>
  }
  return { data: mapAffaireToComputed(result.data as unknown as Record<string, unknown>) }
}

// --- Update via CrudService (validation, existence check, unique check, userId injection handled) ---

export async function updateAffaire(
  id_affaire: number,
  input: AffaireUpdateInput,
  userId: string,
): Promise<ServiceResult<AffaireWithComputed>> {
  const result = await baseCrud.update(id_affaire, input, userId)
  if (result.error) {
    return result as ServiceResult<AffaireWithComputed>
  }
  return { data: mapAffaireToComputed(result.data as unknown as Record<string, unknown>) }
}

// --- Custom soft delete ---

export async function deleteAffaire(
  id_affaire: number,
  userId: string,
): Promise<ServiceResult<{ success: boolean }>> {
  const result = await baseCrud.delete(id_affaire, userId)
  if (result.error) {
    return result as ServiceResult<{ success: boolean }>
  }
  return { data: { success: true } }
}

// --- Domain-specific: document queries (non-CRUD, standalone) ---

export async function getAffaireDocumentsById(
  id_affaire: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<Record<string, unknown>> & { error?: string; code?: ServiceErrorCode }> {
  try {
    const affaire = await prisma.affaire.findUnique({
      where: { id_affaire },
    })
    if (!affaire) {
      return { ...createEmptyResult(page, limit, 'Affaire introuvable'), data: [] as Record<string, unknown>[], ...serviceError('Affaire introuvable', 'NOT_FOUND') }
    }

    const { skip } = getPaginationParams({ page, limit })

    const [documents, total] = await Promise.all([
      prisma.docVente.findMany({
        where: { id_affaire },
        skip,
        take: limit,
        orderBy: { date_creation: 'desc' },
        include: {
          lignes: { select: { id_ligne: true } },
        },
      }),
      prisma.docVente.count({ where: { id_affaire } }),
    ])

    return {
      data: documents as unknown as Record<string, unknown>[],
      meta: buildPaginationMeta(total, page, limit),
    }
  } catch (error) {
    log.error({ error, id_affaire }, 'Échec de la récupération des documents de l\'affaire')
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des documents'), data: [] as Record<string, unknown>[], ...serviceError('Échec de la récupération des documents', 'INTERNAL') }
  }
}

export async function getAffaireByCode(code_affaire: string): Promise<ServiceResult<AffaireWithComputed | null>> {
  const result = validatedOrError(getAffaireByCodeSchema, { code_affaire })
  if (result.error) {
    return { error: result.error, code: result.code }
  }

  try {
    const affaire = await prisma.affaire.findFirst({
      where: { code_affaire },
      include: {
        client: { select: { nom_partenaire: true, code_partenaire: true, type_partenaire: true } },
      },
    })

    if (!affaire) {
      return serviceError('Affaire introuvable', 'NOT_FOUND')
    }

    return { data: mapAffaireToComputed(affaire as unknown as Record<string, unknown>) }
  } catch (error) {
    log.error({ error, code_affaire }, 'Échec de la récupération de l\'affaire')
    return serviceError('Échec de la récupération de l\'affaire', 'INTERNAL')
  }
}

export async function getDocumentsByAffaire(code_affaire: string): Promise<{ data: DocumentBase[]; error?: string; code?: ServiceErrorCode }> {
  const result = validatedOrError(getAffaireByCodeSchema, { code_affaire }, { message: 'Code affaire invalide' })
  if (result.error) {
    log.error({ error: result.error, code_affaire }, 'Code affaire invalide')
    return { data: [], error: result.error, code: result.code }
  }

  try {
    const documents = await prisma.docVente.findMany({
      where: { numero_affaire: code_affaire },
      include: {
        partenaire: { select: { nom_partenaire: true, type_partenaire: true } }
      },
      orderBy: { date_document: 'desc' }
    })

    return {
      data: documents.map((doc) => ({
        ...doc,
        type_document: String(doc.type_document),
        montant_ht: doc.montant_ht,
        montant_ttc: doc.montant_ttc,
        solde_du: doc.solde_du
      }))
    }
  } catch (error) {
    log.error({ error, code_affaire }, 'Échec de la récupération des documents de l\'affaire')
    return { data: [], ...serviceError('Échec de la récupération des documents de l\'affaire', 'INTERNAL') }
  }
}
