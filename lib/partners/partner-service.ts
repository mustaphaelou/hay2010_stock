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
import { computePartnerBalance } from '@/lib/partners/partner-display'

const log = createLogger('partner-service')

function mapPartnerToComputed(partner: Record<string, unknown>, soldeCourant: number = 0): PartnerWithComputed {
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
    solde_courant: soldeCourant,
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
  createUserIdField: 'cree_par',
  updateUserIdField: 'modifie_par',
  conflictFormatter: (field, value) => `Le partenaire ${value} existe déjà`,
  softDelete: { field: 'est_actif', value: false, userIdField: 'modifie_par' },
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

    const partnerIds = partners.map(p => p.id_partenaire)
    const balances = partnerIds.length > 0 ? await prisma.docVente.groupBy({
      by: ['id_partenaire', 'type_document'],
      where: {
        id_partenaire: { in: partnerIds },
        domaine_document: 'VENTE',
        type_document: { in: ['Facture', 'Avoir', 'FACTURE', 'AVOIR'] },
        statut_document: { notIn: ['ANNULE', 'BROUILLON'] },
        solde_du: { gt: 0 }
      },
      _sum: {
        solde_du: true
      }
    }) : []

    const balanceMap: Record<number, number> = {}
    for (const agg of balances) {
      const pid = agg.id_partenaire
      const sum = Number(agg._sum.solde_du || 0)
      const type = agg.type_document.toUpperCase()
      
      if (!balanceMap[pid]) {
        balanceMap[pid] = 0
      }
      
      if (type === 'FACTURE') {
        balanceMap[pid] += sum
      } else if (type === 'AVOIR') {
        balanceMap[pid] -= sum
      }
    }

    return {
      data: partners.map(p => mapPartnerToComputed(p, balanceMap[p.id_partenaire] || 0)),
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
    const solde = await computePartnerBalance(id)
    return { data: mapPartnerToComputed(result.data as unknown as Record<string, unknown>, solde) }
  }
  return result as ServiceResult<PartnerWithComputed>
}

// --- Custom create with userId tracking ---

export async function createPartner(
  input: CreatePartnerInput,
  userId: string,
): Promise<ServiceResult<PartnerWithComputed>> {
  const result = await baseCrud.create(input, userId)
  if (result.error) {
    return result as ServiceResult<PartnerWithComputed>
  }
  const id = (result.data as any).id_partenaire
  const solde = await computePartnerBalance(id)
  return { data: mapPartnerToComputed(result.data as unknown as Record<string, unknown>, solde) }
}

// --- Custom update with conditional unique code check and userId tracking ---

export async function updatePartner(
  id: number,
  input: UpdatePartnerInput,
  userId: string,
): Promise<ServiceResult<PartnerWithComputed>> {
  const result = await baseCrud.update(id, input, userId)
  if (result.error) {
    return result as ServiceResult<PartnerWithComputed>
  }
  const idToUse = (result.data as any).id_partenaire || id
  const solde = await computePartnerBalance(idToUse)
  return { data: mapPartnerToComputed(result.data as unknown as Record<string, unknown>, solde) }
}

// --- Custom soft delete ---

export async function deletePartner(
  id: number,
  userId?: string,
): Promise<ServiceResult<{ success: boolean }>> {
  const result = await baseCrud.delete(id, userId)
  if (result.error) {
    return result as ServiceResult<{ success: boolean }>
  }
  return { data: { success: true } }
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
