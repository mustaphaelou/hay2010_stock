import { prisma } from '@/lib/db/prisma'
import { getAffairesSchema, getAffaireByCodeSchema } from '@/lib/affaires/validation'
import type { AffaireWithComputed, DocumentBase } from '@/lib/types'
import { createLogger } from '@/lib/logger'
import { createEmptyResult, buildPaginationMeta, getPaginationParams } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'
import type { GetAffairesInput } from '@/lib/affaires/validation'

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

export async function getAffaires(page: number = 1, limit: number = 50, filters?: Partial<GetAffairesInput>): Promise<PaginatedResult<AffaireWithComputed> & { error?: string }> {
  const validationResult = getAffairesSchema.safeParse({ page, limit, ...filters })
  if (!validationResult.success) {
    return createEmptyResult<AffaireWithComputed>(page, limit, 'Invalid filter parameters')
  }

  const validated = validationResult.data
  const { skip } = getPaginationParams({ page: validated.page, limit: validated.limit })

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
        orderBy: { code_affaire: 'asc' },
      }),
      prisma.affaire.count({ where }),
    ])

    return {
      data: affaires.map((a) => mapAffaireToComputed(a as unknown as Record<string, unknown>)),
      meta: buildPaginationMeta(total, validated.page, validated.limit),
    }
  } catch (error) {
    log.error({ error }, 'Failed to fetch affaires')
    return createEmptyResult<AffaireWithComputed>(page, limit, 'Failed to fetch affaires')
  }
}

export async function getAffaireByCode(code_affaire: string): Promise<{ data?: AffaireWithComputed | null; error?: string }> {
  const validationResult = getAffaireByCodeSchema.safeParse({ code_affaire })
  if (!validationResult.success) {
    return { error: 'Invalid input: ' + validationResult.error.issues.map((e) => e.message).join(', ') }
  }

  try {
    const affaire = await prisma.affaire.findFirst({
      where: { code_affaire },
      include: {
        client: { select: { nom_partenaire: true, code_partenaire: true, type_partenaire: true } },
      },
    })

    if (!affaire) {
      return { data: null, error: 'Affaire not found' }
    }

    return { data: mapAffaireToComputed(affaire as unknown as Record<string, unknown>) }
  } catch (error) {
    log.error({ error, code_affaire }, 'Failed to fetch affaire')
    return { error: 'Failed to fetch affaire' }
  }
}

export async function getDocumentsByAffaire(code_affaire: string): Promise<{ data: DocumentBase[]; error?: string }> {
  const validationResult = getAffaireByCodeSchema.safeParse({ code_affaire })
  if (!validationResult.success) {
    log.error({ error: validationResult.error, code_affaire }, 'Invalid affaire code')
    return { data: [], error: 'Invalid affaire code' }
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
      data: documents.map((doc: typeof documents[0]) => ({
        ...doc,
        type_document: String(doc.type_document),
        montant_ht: doc.montant_ht,
        montant_ttc: doc.montant_ttc,
        solde_du: doc.solde_du
      }))
    }
  } catch (error) {
    log.error({ error, code_affaire }, 'Failed to fetch documents for affaire')
    return { data: [], error: 'Failed to fetch documents for affaire' }
  }
}
