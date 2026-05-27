import { prisma } from '@/lib/db/prisma'
import {
  getAffairesSchema,
  getAffaireByCodeSchema,
  affaireCreateSchema,
  affaireUpdateSchema,
  getAffaireByIdSchema,
  deleteAffaireSchema,
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

export async function getAffaires(
  page: number = 1,
  limit: number = 50,
  filters?: Partial<GetAffairesInput>,
  sort: string = 'date_creation',
  order: 'asc' | 'desc' = 'desc',
): Promise<PaginatedResult<AffaireWithComputed> & { error?: string }> {
  const validationResult = getAffairesSchema.safeParse({ page, limit, ...filters })
  if (!validationResult.success) {
    return createEmptyResult<AffaireWithComputed>(page, limit, 'Paramètres de filtre invalides')
  }

  const validated = validationResult.data
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
    return createEmptyResult<AffaireWithComputed>(page, limit, 'Échec de la récupération des affaires')
  }
}

export async function getAffaireById(
  id_affaire: number,
): Promise<{ data?: AffaireWithComputed | null; error?: string }> {
  const validationResult = getAffaireByIdSchema.safeParse({ id_affaire })
  if (!validationResult.success) {
    return { error: 'ID d\'affaire invalide' }
  }

  try {
    const affaire = await prisma.affaire.findUnique({
      where: { id_affaire },
      include: {
        client: { select: { id_partenaire: true, code_partenaire: true, nom_partenaire: true } },
      },
    })

    if (!affaire) {
      return { data: null, error: 'Affaire introuvable' }
    }

    return { data: mapAffaireToComputed(affaire as unknown as Record<string, unknown>) }
  } catch (error) {
    log.error({ error, id_affaire }, 'Échec de la récupération de l\'affaire')
    return { error: 'Échec de la récupération de l\'affaire' }
  }
}

export async function createAffaire(
  input: AffaireCreateInput,
  userId: string,
): Promise<{ data?: AffaireWithComputed; error?: string }> {
  const validationResult = affaireCreateSchema.safeParse(input)
  if (!validationResult.success) {
    return { error: 'Validation échouée: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  const validatedInput = validationResult.data

  try {
    const existing = await prisma.affaire.findUnique({
      where: { code_affaire: validatedInput.code_affaire },
    })
    if (existing) {
      return { error: `L'affaire ${validatedInput.code_affaire} existe déjà` }
    }

    const affaire = await prisma.affaire.create({
      data: {
        ...validatedInput,
        cree_par: userId,
      },
    })

    return { data: mapAffaireToComputed(affaire as unknown as Record<string, unknown>) }
  } catch (error) {
    log.error({ error, input: validatedInput }, 'Échec de la création de l\'affaire')
    return { error: 'Échec de la création de l\'affaire' }
  }
}

export async function updateAffaire(
  id_affaire: number,
  input: AffaireUpdateInput,
  userId: string,
): Promise<{ data?: AffaireWithComputed; error?: string }> {
  const validationResult = affaireUpdateSchema.safeParse(input)
  if (!validationResult.success) {
    return { error: 'Validation échouée: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  const validatedInput = validationResult.data

  try {
    const existing = await prisma.affaire.findUnique({
      where: { id_affaire },
    })
    if (!existing) {
      return { error: 'Affaire introuvable' }
    }

    if (validatedInput.code_affaire && validatedInput.code_affaire !== existing.code_affaire) {
      const duplicate = await prisma.affaire.findUnique({
        where: { code_affaire: validatedInput.code_affaire },
      })
      if (duplicate) {
        return { error: `L'affaire ${validatedInput.code_affaire} existe déjà` }
      }
    }

    const affaire = await prisma.affaire.update({
      where: { id_affaire },
      data: {
        ...validatedInput,
        modifie_par: userId,
      },
    })

    return { data: mapAffaireToComputed(affaire as unknown as Record<string, unknown>) }
  } catch (error) {
    log.error({ error, id_affaire, input: validatedInput }, 'Échec de la mise à jour de l\'affaire')
    return { error: 'Échec de la mise à jour de l\'affaire' }
  }
}

export async function deleteAffaire(
  id_affaire: number,
  userId: string,
): Promise<{ data?: { success: boolean }; error?: string }> {
  const validationResult = deleteAffaireSchema.safeParse({ id_affaire })
  if (!validationResult.success) {
    return { error: 'ID d\'affaire invalide' }
  }

  try {
    const existing = await prisma.affaire.findUnique({
      where: { id_affaire },
    })
    if (!existing) {
      return { error: 'Affaire introuvable' }
    }

    await prisma.affaire.update({
      where: { id_affaire },
      data: { est_actif: false, modifie_par: userId },
    })

    return { data: { success: true } }
  } catch (error) {
    log.error({ error, id_affaire }, 'Échec de la suppression de l\'affaire')
    return { error: 'Échec de la suppression de l\'affaire' }
  }
}

export async function getAffaireDocumentsById(
  id_affaire: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<Record<string, unknown>> & { error?: string }> {
  try {
    const affaire = await prisma.affaire.findUnique({
      where: { id_affaire },
    })
    if (!affaire) {
      return { ...createEmptyResult(page, limit, 'Affaire introuvable'), data: [] as Record<string, unknown>[] }
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
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des documents'), data: [] as Record<string, unknown>[] }
  }
}

export async function getAffaireByCode(code_affaire: string): Promise<{ data?: AffaireWithComputed | null; error?: string }> {
  const validationResult = getAffaireByCodeSchema.safeParse({ code_affaire })
  if (!validationResult.success) {
    return { error: 'Entrée invalide: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  try {
    const affaire = await prisma.affaire.findFirst({
      where: { code_affaire },
      include: {
        client: { select: { nom_partenaire: true, code_partenaire: true, type_partenaire: true } },
      },
    })

    if (!affaire) {
      return { data: null, error: 'Affaire introuvable' }
    }

    return { data: mapAffaireToComputed(affaire as unknown as Record<string, unknown>) }
  } catch (error) {
    log.error({ error, code_affaire }, 'Échec de la récupération de l\'affaire')
    return { error: 'Échec de la récupération de l\'affaire' }
  }
}

export async function getDocumentsByAffaire(code_affaire: string): Promise<{ data: DocumentBase[]; error?: string }> {
  const validationResult = getAffaireByCodeSchema.safeParse({ code_affaire })
  if (!validationResult.success) {
    log.error({ error: validationResult.error, code_affaire }, 'Code affaire invalide')
    return { data: [], error: 'Code affaire invalide' }
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
    return { data: [], error: 'Échec de la récupération des documents de l\'affaire' }
  }
}
