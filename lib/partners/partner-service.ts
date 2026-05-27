import { prisma } from '@/lib/db/prisma'
import { getPartnersSchema, createPartnerSchema, updatePartnerSchema, deletePartnerSchema } from '@/lib/partners/validation'
import type { PartnerWithComputed } from '@/lib/types'
import type { CreatePartnerInput, UpdatePartnerInput } from '@/lib/partners/validation'
import { TypePartenaire } from '@/lib/generated/prisma'
import { createLogger } from '@/lib/logger'
import { createEmptyResult, buildPaginationMeta, getPaginationParams } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'


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

export async function getPartners(
  type?: string,
  page: number = 1,
  limit: number = 50,
  search?: string,
  sort: string = 'nom_partenaire',
  order: 'asc' | 'desc' = 'asc',
): Promise<PaginatedResult<PartnerWithComputed> & { error?: string }> {
  const validationResult = getPartnersSchema.safeParse({ type })
  if (!validationResult.success) {
    log.error({ error: validationResult.error }, 'Filtres partenaires invalides')
    return createEmptyResult<PartnerWithComputed>(page, limit, 'Paramètres de filtre invalides')
  }

  const { skip } = getPaginationParams({ page, limit })

  const effectiveSort = ALLOWED_SORT_FIELDS.includes(sort as AllowedSortField)
    ? (sort as AllowedSortField)
    : 'nom_partenaire'

  try {
    const whereClause: Record<string, unknown> = {}
    if (type && type !== 'all' && Object.values(TypePartenaire).includes(type as TypePartenaire)) {
      whereClause.type_partenaire = type as TypePartenaire
    }
    if (search) {
      whereClause.OR = [
        { nom_partenaire: { contains: search, mode: 'insensitive' } },
        { code_partenaire: { contains: search, mode: 'insensitive' } },
        { ville: { contains: search, mode: 'insensitive' } },
      ]
    }
    const [partners, total] = await Promise.all([
      prisma.partenaire.findMany({
        skip,
        take: limit,
        where: whereClause,
        orderBy: { [effectiveSort]: order }
      }),
      prisma.partenaire.count({ where: whereClause })
    ])

    return {
      data: partners.map(mapPartnerToComputed),
      meta: buildPaginationMeta(total, page, limit)
    }
  } catch (error) {
    log.error({ error, type }, 'Échec de la récupération des partenaires')
    return createEmptyResult<PartnerWithComputed>(page, limit, 'Échec de la récupération des partenaires')
  }
}

export async function getPartnerById(
  id_partenaire: number,
): Promise<{ data?: PartnerWithComputed; error?: string }> {
  if (!Number.isFinite(id_partenaire) || id_partenaire <= 0) {
    return { error: 'ID partenaire invalide' }
  }

  try {
    const partner = await prisma.partenaire.findUnique({
      where: { id_partenaire },
    })

    if (!partner) {
      return { error: 'Partenaire introuvable' }
    }

    return { data: mapPartnerToComputed(partner as unknown as Record<string, unknown>) }
  } catch (error) {
    log.error({ error, id_partenaire }, 'Échec de la récupération du partenaire')
    return { error: 'Échec de la récupération du partenaire' }
  }
}

export async function createPartner(
  input: CreatePartnerInput,
  userId: string,
): Promise<{ data?: PartnerWithComputed; error?: string }> {
  const validationResult = createPartnerSchema.safeParse(input)
  if (!validationResult.success) {
    return { error: 'Validation échouée: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  const validatedInput = validationResult.data

  try {
    const existing = await prisma.partenaire.findUnique({
      where: { code_partenaire: validatedInput.code_partenaire },
    })
    if (existing) {
      return { error: `Le partenaire ${validatedInput.code_partenaire} existe déjà` }
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
    return { error: 'Échec de la création du partenaire' }
  }
}

export async function updatePartner(
  id_partenaire: number,
  input: UpdatePartnerInput,
  userId: string,
): Promise<{ data?: PartnerWithComputed; error?: string }> {
  const validationResult = updatePartnerSchema.safeParse(input)
  if (!validationResult.success) {
    return { error: 'Validation échouée: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  const validatedInput = validationResult.data

  try {
    const existing = await prisma.partenaire.findUnique({
      where: { id_partenaire },
    })
    if (!existing) {
      return { error: 'Partenaire introuvable' }
    }

    if (validatedInput.code_partenaire && validatedInput.code_partenaire !== existing.code_partenaire) {
      const duplicate = await prisma.partenaire.findUnique({
        where: { code_partenaire: validatedInput.code_partenaire },
      })
      if (duplicate) {
        return { error: `Le partenaire ${validatedInput.code_partenaire} existe déjà` }
      }
    }

    const partner = await prisma.partenaire.update({
      where: { id_partenaire },
      data: {
        ...validatedInput,
        modifie_par: userId,
        limite_credit: validatedInput.limite_credit ?? undefined,
      },
    })

    return { data: mapPartnerToComputed(partner as unknown as Record<string, unknown>) }
  } catch (error) {
    log.error({ error, id_partenaire, input: validatedInput }, 'Échec de la mise à jour du partenaire')
    return { error: 'Échec de la mise à jour du partenaire' }
  }
}

export async function deletePartner(
  id_partenaire: number,
  userId?: string,
): Promise<{ data?: { success: boolean }; error?: string }> {
  const validationResult = deletePartnerSchema.safeParse({ id_partenaire })
  if (!validationResult.success) {
    return { error: 'Validation échouée: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  try {
    const existing = await prisma.partenaire.findUnique({
      where: { id_partenaire },
    })
    if (!existing) {
      return { error: 'Partenaire introuvable' }
    }

    await prisma.partenaire.update({
      where: { id_partenaire },
      data: { est_actif: false, modifie_par: userId ?? undefined },
    })

    return { data: { success: true } }
  } catch (error) {
    log.error({ error, id_partenaire }, 'Échec de la suppression du partenaire')
    return { error: 'Échec de la suppression du partenaire' }
  }
}

export async function getPartnerDocuments(
  partnerId: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<Record<string, unknown>> & { error?: string }> {
  try {
    const partner = await prisma.partenaire.findUnique({
      where: { id_partenaire: partnerId },
    })
    if (!partner) {
      return { ...createEmptyResult(page, limit, 'Partenaire introuvable'), data: [] as Record<string, unknown>[] }
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
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des documents'), data: [] as Record<string, unknown>[] }
  }
}
