import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import type { Partenaire } from '@/lib/generated/prisma/client'
import { createLogger } from '@/lib/logger'
import { createEmptyResult, buildPaginationMeta, getPaginationParams } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'
import { serviceError, validatedOrError } from '@/lib/service-result'
import type { ServiceResult, ServiceErrorCode } from '@/lib/service-result'
import { createCrudService } from '@/lib/crud-service'
import { getPartnersSchema, createPartnerSchema, updatePartnerSchema, deletePartnerSchema } from '@/lib/partners/validation'
import type { PartnerWithComputed } from '@/lib/types'
import type { CreatePartnerInput, UpdatePartnerInput } from '@/lib/partners/validation'
import { TypePartenaire } from '@/lib/generated/prisma'

const log = createLogger('partner-service')

function mapPartnerToComputed(partner: Record<string, unknown>): PartnerWithComputed {
  return {
    id_partenaire: partner.id_partenaire as number,
    code_partenaire: partner.code_partenaire as string,
    nom_partenaire: partner.nom_partenaire as string,
    type_partenaire: partner.type_partenaire as string,
    adresse_email: partner.adresse_email as string | null,
    numero_telephone: partner.numero_telephone as string | null,
    numero_fax: partner.numero_fax as string | null,
    url_site_web: partner.url_site_web as string | null,
    adresse_rue: partner.adresse_rue as string | null,
    code_postal: partner.code_postal as string | null,
    ville: partner.ville as string | null,
    pays: partner.pays as string | null,
    numero_tva: partner.numero_tva as string | null,
    numero_ice: partner.numero_ice as string | null,
    numero_rc: partner.numero_rc as string | null,
    delai_paiement_jours: partner.delai_paiement_jours as number | null,
    limite_credit: partner.limite_credit as never,
    pourcentage_remise: Number(partner.pourcentage_remise ?? 0),
    numero_compte_bancaire: partner.numero_compte_bancaire as string | null,
    code_banque: partner.code_banque as string | null,
    numero_iban: partner.numero_iban as string | null,
    code_swift: partner.code_swift as string | null,
    est_actif: partner.est_actif as boolean,
    est_bloque: partner.est_bloque as boolean,
    date_creation: partner.date_creation as Date,
    date_modification: partner.date_modification as Date,
    cree_par: partner.cree_par as string | null,
    modifie_par: partner.modifie_par as string | null,
    compte_collectif: partner.compte_collectif as string | null,
    compte_auxiliaire: partner.compte_auxiliaire as string | null,
    plafond_credit: Number(partner.limite_credit ?? 0),
    solde_courant: 0,
  }
}

const ALLOWED_SORT_FIELDS = [
  'id_partenaire',
  'code_partenaire',
  'nom_partenaire',
  'type_partenaire',
  'ville',
  'pays',
  'date_creation',
  'date_modification',
] as const

type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number]

const baseCrud = createCrudService<Partenaire, CreatePartnerInput, UpdatePartnerInput>({
  delegate: prisma.partenaire as any,
  entityName: 'Partenaire',
  createSchema: createPartnerSchema,
  updateSchema: updatePartnerSchema,
  uniqueFields: ['code_partenaire'],
  idField: 'id_partenaire',
})

// --- Standard CRUD via CrudService ---

export const ensurePartnerExists = baseCrud.ensureExists

// --- Custom list with type filter, search, sort validation, pagination meta ---

export async function getPartners(
  type?: string,
  page: number = 1,
  limit: number = 50,
  search?: string,
  sort: string = 'nom_partenaire',
  order: 'asc' | 'desc' = 'asc',
): Promise<PaginatedResult<PartnerWithComputed> & { error?: string; code?: ServiceErrorCode }> {
  const result = validatedOrError(getPartnersSchema, { type }, { message: 'Paramètres de filtre invalides' })
  if (result.error) {
    log.error({ error: result.error }, 'Filtres partenaires invalides')
    return { ...createEmptyResult<PartnerWithComputed>(page, limit, result.error), error: result.error, code: result.code }
  }

  const { skip } = getPaginationParams({ page, limit })

  const effectiveSort = ALLOWED_SORT_FIELDS.includes(sort as AllowedSortField)
    ? (sort as AllowedSortField)
    : 'nom_partenaire'

  try {
    const where: Prisma.PartenaireWhereInput = {}
    if (type && type !== 'all' && Object.values(TypePartenaire).includes(type as TypePartenaire)) {
      where.type_partenaire = type as TypePartenaire
    }
    if (search) {
      where.OR = [
        { nom_partenaire: { contains: search, mode: 'insensitive' } },
        { code_partenaire: { contains: search, mode: 'insensitive' } },
        { ville: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [partners, total] = await Promise.all([
      prisma.partenaire.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [effectiveSort]: order },
      }),
      prisma.partenaire.count({ where }),
    ])

    return {
      data: partners.map(mapPartnerToComputed),
      meta: buildPaginationMeta(total, page, limit),
    }
  } catch (error) {
    log.error({ error, type }, 'Échec de la récupération des partenaires')
    return { ...createEmptyResult<PartnerWithComputed>(page, limit, 'Échec de la récupération des partenaires'), ...serviceError('Échec de la récupération des partenaires', 'INTERNAL') }
  }
}

// --- Wrap CrudService getById ---

export async function getPartnerById(id: number): Promise<ServiceResult<PartnerWithComputed>> {
  const result = await baseCrud.getById(id)
  if (!result.error && result.data === null) {
    return serviceError('Partenaire introuvable', 'NOT_FOUND')
  }
  if (result.data) {
    return { data: mapPartnerToComputed(result.data as unknown as Record<string, unknown>) }
  }
  return result as ServiceResult<PartnerWithComputed>
}

// --- Custom create with userId tracking ---

export async function createPartner(
  input: CreatePartnerInput,
  userId: string,
): Promise<ServiceResult<PartnerWithComputed>> {
  const result = validatedOrError(createPartnerSchema, input)
  if (result.error || !result.data) {
    return { error: result.error || 'Données invalides', code: result.code || 'VALIDATION' }
  }

  const validatedInput = result.data

  try {
    const existing = await prisma.partenaire.findUnique({
      where: { code_partenaire: validatedInput.code_partenaire },
    })
    if (existing) {
      return serviceError(`Le partenaire ${validatedInput.code_partenaire} existe déjà`, 'CONFLICT')
    }

    const partner = await prisma.partenaire.create({
      data: {
        ...validatedInput,
        cree_par: userId,
        limite_credit: validatedInput.limite_credit ?? undefined,
      },
    })

    return { data: mapPartnerToComputed(partner as unknown as Record<string, unknown>) }
  } catch (error) {
    log.error({ error, input: validatedInput }, 'Échec de la création du partenaire')
    return serviceError('Échec de la création du partenaire', 'INTERNAL')
  }
}

// --- Custom update with conditional unique code check and userId tracking ---

export async function updatePartner(
  id: number,
  input: UpdatePartnerInput,
  userId: string,
): Promise<ServiceResult<PartnerWithComputed>> {
  const parsed = validatedOrError(updatePartnerSchema, input)
  if (parsed.error || !parsed.data) {
    return { error: parsed.error || 'Données invalides', code: parsed.code || 'VALIDATION' }
  }

  const d = parsed.data

  try {
    const existing = await prisma.partenaire.findUnique({
      where: { id_partenaire: id },
    })
    if (!existing) {
      return serviceError('Partenaire introuvable', 'NOT_FOUND')
    }

    if (d.code_partenaire && d.code_partenaire !== existing.code_partenaire) {
      const duplicate = await prisma.partenaire.findUnique({
        where: { code_partenaire: d.code_partenaire },
      })
      if (duplicate) {
        return serviceError(`Le partenaire ${d.code_partenaire} existe déjà`, 'CONFLICT')
      }
    }

    const partner = await prisma.partenaire.update({
      where: { id_partenaire: id },
      data: {
        ...d,
        modifie_par: userId,
        limite_credit: d.limite_credit ?? undefined,
      },
    })

    return { data: mapPartnerToComputed(partner as unknown as Record<string, unknown>) }
  } catch (error) {
    log.error({ error, id, input: d }, 'Échec de la mise à jour du partenaire')
    return serviceError('Échec de la mise à jour du partenaire', 'INTERNAL')
  }
}

// --- Custom soft delete ---

export async function deletePartner(
  id: number,
  userId?: string,
): Promise<ServiceResult<{ success: boolean }>> {
  const parsed = validatedOrError(deletePartnerSchema, { id_partenaire: id })
  if (parsed.error) {
    return { error: parsed.error, code: parsed.code }
  }

  try {
    const existing = await prisma.partenaire.findUnique({
      where: { id_partenaire: id },
    })
    if (!existing) {
      return serviceError('Partenaire introuvable', 'NOT_FOUND')
    }

    await prisma.partenaire.update({
      where: { id_partenaire: id },
      data: { est_actif: false, modifie_par: userId ?? undefined },
    })

    return { data: { success: true } }
  } catch (error) {
    log.error({ error, id }, 'Échec de la suppression du partenaire')
    return serviceError('Échec de la suppression du partenaire', 'INTERNAL')
  }
}

// --- Domain-specific: partner documents (non-CRUD, standalone) ---

export async function getPartnerDocuments(
  partnerId: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<Record<string, unknown>> & { error?: string; code?: ServiceErrorCode }> {
  try {
    const partner = await prisma.partenaire.findUnique({
      where: { id_partenaire: partnerId },
    })
    if (!partner) {
      return { ...createEmptyResult(page, limit, 'Partenaire introuvable'), data: [] as Record<string, unknown>[], ...serviceError('Partenaire introuvable', 'NOT_FOUND') }
    }

    const { skip } = getPaginationParams({ page, limit })

    const [documents, total] = await Promise.all([
      prisma.docVente.findMany({
        where: { id_partenaire: partnerId },
        skip,
        take: limit,
        orderBy: { date_creation: 'desc' },
        include: {
          lignes: { select: { id_ligne: true } },
        },
      }),
      prisma.docVente.count({ where: { id_partenaire: partnerId } }),
    ])

    return {
      data: documents as unknown as Record<string, unknown>[],
      meta: buildPaginationMeta(total, page, limit),
    }
  } catch (error) {
    log.error({ error, partnerId }, 'Échec de la récupération des documents du partenaire')
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des documents'), data: [] as Record<string, unknown>[], ...serviceError('Échec de la récupération des documents', 'INTERNAL') }
  }
}
