import { prisma } from '@/lib/db/prisma'
import { paginationSchema } from '@/lib/pagination'
import {
  getDocLinesSchema,
  documentCreateSchema,
  documentUpdateSchema,
  getDocumentByIdSchema,
  deleteDocumentSchema,
  ALLOWED_DOCUMENT_SORT_FIELDS,
} from '@/lib/documents/validation'
import type {
  DocumentCreateInput,
  DocumentUpdateInput,
  DocumentListParams,
  AllowedDocumentSortField,
} from '@/lib/documents/validation'
import type { DocumentWithComputed, DocumentLine, DocumentBase, SalesInvoice } from '@/lib/types'
import { createLogger } from '@/lib/logger'
import { createEmptyResult, buildPaginationMeta, getPaginationParams } from '@/lib/pagination'
import type { PaginatedResult } from '@/lib/pagination'
import { hasRole } from '@/lib/auth/authorization'
import type { UserRole } from '@/lib/auth/authorization'
import { Prisma } from '@/lib/generated/prisma/client'
import { serviceError, validatedOrError } from '@/lib/service-result'
import type { ServiceResult, ServiceErrorCode } from '@/lib/service-result'
import { createCrudService } from '@/lib/crud-service'
import type { DocVente } from '@/lib/generated/prisma/client'

function mapDocumentToComputed(doc: DocumentBase): DocumentWithComputed {
  return {
    ...doc,
    montant_ht_num: Number(doc.montant_ht || 0),
    montant_ttc_num: Number(doc.montant_ttc || 0),
    solde_du_num: Number(doc.solde_du || 0),
    montant_regle: Number(doc.montant_ttc || 0) - Number(doc.solde_du || 0),
    numero_piece: doc.numero_document,
    nom_tiers: doc.nom_partenaire_snapshot || doc.partenaire?.nom_partenaire || null,
    reference: doc.reference_externe || null,
    montant_tva_num: Number(doc.montant_tva_total || 0),
    montant_remise_num: Number(doc.montant_remise_total || 0),
    domaine: doc.domaine_document
  }
}

function mapLineToDocumentLine(
  line: Record<string, unknown> & {
    numero_ligne: number
    quantite_commandee: Prisma.Decimal
    prix_unitaire_ht: Prisma.Decimal
    montant_ht: Prisma.Decimal
    montant_ttc: Prisma.Decimal
    nom_produit_snapshot: string | null
    code_produit_snapshot: string | null
    produit: { nom_produit: string } | null
  }
): DocumentLine {
  return {
    ...line,
    quantite: Number(line.quantite_commandee || 0),
    prix_unitaire: Number(line.prix_unitaire_ht || 0),
    montant_ht_num: Number(line.montant_ht || 0),
    montant_ttc_num: Number(line.montant_ttc || 0),
    designation: line.nom_produit_snapshot || line.produit?.nom_produit || null,
    reference_article: line.code_produit_snapshot || null,
    ordre: line.numero_ligne,
    code_taxe: null
  } as DocumentLine
}

const log = createLogger('document-service')

const baseCrud = createCrudService<DocVente, DocumentCreateInput, DocumentUpdateInput>({
  delegate: prisma.docVente as any,
  entityName: 'Document',
  createSchema: documentCreateSchema,
  updateSchema: documentUpdateSchema,
  uniqueFields: ['numero_document'],
  idField: 'id_document',
})

export const ensureDocumentExists = baseCrud.ensureExists

function applyRowLevelSecurity(user: { id: string; role: string }, whereClause: Record<string, unknown> = {}): Record<string, unknown> {
  if (hasRole(user.role as UserRole, 'ADMIN')) return whereClause
  return { ...whereClause, cree_par: user.id }
}

export async function listDocuments(
  params: DocumentListParams,
  user: { id: string; role: string }
): Promise<PaginatedResult<DocumentWithComputed> & { error?: string; code?: ServiceErrorCode }> {
  const result = validatedOrError(paginationSchema, { page: params.page, limit: params.limit }, { message: 'Paramètres de pagination invalides' })
  if (result.error) {
    return { ...createEmptyResult<DocumentWithComputed>(params.page, params.limit, result.error), error: result.error, code: result.code }
  }
  const safePage = result.data?.page ?? params.page
  const safeLimit = result.data?.limit ?? params.limit
  const { skip } = getPaginationParams({ page: safePage, limit: safeLimit })

  const effectiveSort = ALLOWED_DOCUMENT_SORT_FIELDS.includes(params.sort as AllowedDocumentSortField)
    ? (params.sort as AllowedDocumentSortField)
    : 'date_document'
  const effectiveOrder = params.order === 'asc' ? ('asc' as const) : ('desc' as const)

  try {
    const where: Prisma.DocVenteWhereInput = {}
    if (params.domaine) {
      where.domaine_document = params.domaine
    }
    if (params.type_document) {
      where.type_document = params.type_document
    }
    if (params.statut_document) {
      where.statut_document = params.statut_document
    }
    if (params.id_partenaire) {
      where.id_partenaire = params.id_partenaire
    }
    if (params.id_affaire) {
      where.id_affaire = params.id_affaire
    }
    if (params.search) {
      where.OR = [
        { numero_document: { contains: params.search, mode: 'insensitive' } },
        { nom_partenaire_snapshot: { contains: params.search, mode: 'insensitive' } },
        { reference_externe: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const whereClause = applyRowLevelSecurity(user, where)

    const [documents, total] = await Promise.all([
      prisma.docVente.findMany({
        skip,
        take: safeLimit,
        where: whereClause,
        include: {
          partenaire: {
            select: {
              nom_partenaire: true,
              type_partenaire: true,
            },
          },
          _count: {
            select: { lignes: true },
          },
        },
        orderBy: { [effectiveSort]: effectiveOrder },
      }),
      prisma.docVente.count({ where: whereClause }),
    ])

    return {
      data: documents.map(mapDocumentToComputed) as DocumentWithComputed[],
      meta: buildPaginationMeta(total, safePage, safeLimit),
    }
  } catch (error) {
    log.error({ error }, 'Échec de la récupération des documents')
    return { ...createEmptyResult<DocumentWithComputed>(safePage, safeLimit, 'Échec de la récupération des documents'), ...serviceError('Échec de la récupération des documents', 'INTERNAL') }
  }
}

export async function getDocumentById(id_document: number): Promise<ServiceResult<DocumentWithComputed>> {
  const result = validatedOrError(getDocumentByIdSchema, { id_document }, { message: 'ID de document invalide' })
  if (result.error) {
    return { error: result.error, code: result.code }
  }

  const record = await baseCrud.getById(id_document)
  if (!record.error && record.data === null) {
    return serviceError('Document introuvable', 'NOT_FOUND')
  }
  if (record.data) {
    return { data: mapDocumentToComputed(record.data as unknown as DocumentBase) }
  }
  return record as ServiceResult<DocumentWithComputed>
}

export async function createDocument(
  input: DocumentCreateInput,
  userId: string,
): Promise<ServiceResult<DocumentWithComputed>> {
  const result = validatedOrError(documentCreateSchema, input)
  if (result.error || !result.data) {
    return { error: result.error || 'Données invalides', code: result.code || 'VALIDATION' }
  }

  const validatedInput = result.data

  try {
    const existing = await prisma.docVente.findUnique({
      where: { numero_document: validatedInput.numero_document },
    })
    if (existing) {
      return serviceError(`Le document ${validatedInput.numero_document} existe déjà`, 'CONFLICT')
    }

    const partner = await prisma.partenaire.findUnique({
      where: { id_partenaire: validatedInput.id_partenaire },
    })
    if (!partner) {
      return serviceError('Partenaire introuvable', 'NOT_FOUND')
    }

    const { id_partenaire, id_affaire, id_entrepot, ...rest } = validatedInput

    const document = await prisma.docVente.create({
      data: {
        ...rest,
        id_partenaire,
        ...(id_affaire ? { id_affaire } : {}),
        ...(id_entrepot ? { id_entrepot } : {}),
        cree_par: userId,
      },
    })

    return { data: mapDocumentToComputed(document as unknown as Parameters<typeof mapDocumentToComputed>[0]) }
  } catch (error) {
    log.error({ error, input: validatedInput }, 'Échec de la création du document')
    return serviceError('Échec de la création du document', 'INTERNAL')
  }
}

export async function updateDocument(
  id_document: number,
  input: DocumentUpdateInput,
  userId: string,
): Promise<ServiceResult<DocumentWithComputed>> {
  const result = validatedOrError(documentUpdateSchema, input)
  if (result.error || !result.data) {
    return { error: result.error || 'Données invalides', code: result.code || 'VALIDATION' }
  }

  const validatedInput = result.data

  try {
    const existing = await prisma.docVente.findUnique({
      where: { id_document },
    })
    if (!existing) {
      return serviceError('Document introuvable', 'NOT_FOUND')
    }

    if (validatedInput.numero_document && validatedInput.numero_document !== existing.numero_document) {
      const duplicate = await prisma.docVente.findUnique({
        where: { numero_document: validatedInput.numero_document },
      })
      if (duplicate) {
        return serviceError(`Le document ${validatedInput.numero_document} existe déjà`, 'CONFLICT')
      }
    }

    const document = await prisma.docVente.update({
      where: { id_document },
      data: {
        ...validatedInput,
        modifie_par: userId,
      },
    })

    return { data: mapDocumentToComputed(document as unknown as Parameters<typeof mapDocumentToComputed>[0]) }
  } catch (error) {
    log.error({ error, id_document, input: validatedInput }, 'Échec de la mise à jour du document')
    return serviceError('Échec de la mise à jour du document', 'INTERNAL')
  }
}

export async function deleteDocument(
  id_document: number,
  userId: string,
): Promise<ServiceResult<{ success: boolean }>> {
  const result = validatedOrError(deleteDocumentSchema, { id_document }, { message: 'ID de document invalide' })
  if (result.error) {
    return { error: result.error, code: result.code }
  }

  try {
    const existing = await prisma.docVente.findUnique({
      where: { id_document },
    })
    if (!existing) {
      return serviceError('Document introuvable', 'NOT_FOUND')
    }

    await prisma.docVente.update({
      where: { id_document },
      data: { statut_document: 'ANNULE', modifie_par: userId },
    })

    return { data: { success: true } }
  } catch (error) {
    log.error({ error, id_document }, 'Échec de la suppression du document')
    return serviceError('Échec de la suppression du document', 'INTERNAL')
  }
}

export async function getDocumentLinesById(
  id_document: number,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResult<Record<string, unknown>> & { error?: string; code?: ServiceErrorCode }> {
  try {
    const document = await prisma.docVente.findUnique({
      where: { id_document },
    })
    if (!document) {
      return { ...createEmptyResult(page, limit, 'Document introuvable'), data: [], ...serviceError('Document introuvable', 'NOT_FOUND') }
    }

    const { skip } = getPaginationParams({ page, limit })

    const [lines, total] = await Promise.all([
      prisma.ligneDocument.findMany({
        where: { id_document },
        skip,
        take: limit,
        orderBy: { numero_ligne: 'asc' },
      }),
      prisma.ligneDocument.count({ where: { id_document } }),
    ])

    return {
      data: lines as unknown as Record<string, unknown>[],
      meta: buildPaginationMeta(total, page, limit),
    }
  } catch (error) {
    log.error({ error, id_document }, 'Échec de la récupération des lignes')
    return { ...createEmptyResult(page, limit, 'Échec de la récupération des lignes'), data: [] as Record<string, unknown>[], ...serviceError('Échec de la récupération des lignes', 'INTERNAL') }
  }
}

export async function getDocLines(docId: number): Promise<{ data: DocumentLine[]; error?: string; code?: ServiceErrorCode }> {
  const result = validatedOrError(getDocLinesSchema, { docId }, { message: 'ID de document invalide' })
  if (result.error) {
    log.error({ error: result.error, docId }, 'docId invalide')
    return { data: [], error: result.error, code: result.code }
  }

  try {
    const lines = await prisma.ligneDocument.findMany({
      where: { id_document: docId },
      include: {
        produit: { select: { nom_produit: true } }
      },
      orderBy: { numero_ligne: 'asc' }
    })

    return {
      data: lines.map(mapLineToDocumentLine)
    }
  } catch (error) {
    log.error({ error, docId }, 'Échec de la récupération des lignes')
    return { data: [], ...serviceError('Échec de la récupération des lignes', 'INTERNAL') }
  }
}

export async function getDocumentWithLinesAndPartner(
  id_document: number,
): Promise<{ data?: { document: DocumentWithComputed; lignes: DocumentLine[]; partenaire: any }; error?: string; code?: ServiceErrorCode }> {
  const result = validatedOrError(getDocumentByIdSchema, { id_document }, { message: 'ID de document invalide' })
  if (result.error) {
    return { error: result.error, code: result.code }
  }

  try {
    const document = await prisma.docVente.findUnique({
      where: { id_document },
      include: {
        partenaire: true,
        lignes: {
          include: {
            produit: { select: { nom_produit: true } }
          },
          orderBy: { numero_ligne: 'asc' }
        }
      }
    })

    if (!document) {
      return serviceError('Document introuvable', 'NOT_FOUND')
    }

    const documentWithComputed = mapDocumentToComputed(document as unknown as DocumentBase)
    const linesWithComputed = (document.lignes || []).map(mapLineToDocumentLine)

    return {
      data: {
        document: documentWithComputed,
        lignes: linesWithComputed,
        partenaire: document.partenaire
      }
    }
  } catch (error) {
    log.error({ error, id_document }, 'Échec de la récupération des détails du document')
    return serviceError('Échec de la récupération des détails du document', 'INTERNAL')
  }
}

export async function getRecentDocuments(limit: number = 5): Promise<{ data: DocumentWithComputed[] }> {
  try {
    const documents = await prisma.docVente.findMany({
      take: limit,
      include: {
        partenaire: {
          select: {
            nom_partenaire: true,
            type_partenaire: true,
          },
        },
      },
      orderBy: { date_creation: 'desc' },
    })
    return { data: documents.map(mapDocumentToComputed) }
  } catch (error) {
    log.error({ error }, 'Échec de la récupération des documents récents')
    return { data: [] }
  }
}

export async function getRecentDocumentLines(limit: number = 20): Promise<{ data: any[] }> {
  try {
    const lines = await prisma.ligneDocument.findMany({
      include: {
        produit: { select: { nom_produit: true, code_produit: true } },
        document: { select: { numero_document: true, date_document: true, type_document: true } }
      },
      orderBy: { id_ligne: 'desc' },
      take: limit
    })
    return { data: lines }
  } catch (error) {
    log.error({ error }, 'Échec de la récupération des lignes de document récentes')
    return { data: [] }
  }
}

export async function getSalesInvoices(limit: number = 100): Promise<{ data: SalesInvoice[] }> {
  try {
    const documents = await prisma.docVente.findMany({
      where: {
        domaine_document: 'VENTE',
        type_document: { in: ['Facture', 'Avoir'] },
      },
      select: {
        id_document: true,
        numero_document: true,
        type_document: true,
        domaine_document: true,
        montant_ttc: true,
        solde_du: true,
        date_document: true,
        montant_ht: true,
        montant_remise_total: true,
        montant_tva_total: true,
      },
      orderBy: { date_document: 'desc' },
      take: limit,
    })
    return {
      data: documents.map((d) => ({
        montant_ttc: d.montant_ttc,
        solde_du: d.solde_du,
        date_document: d.date_document,
        montant_regle: Number(d.montant_ttc) - Number(d.solde_du),
      })),
    }
  } catch (error) {
    log.error({ error }, 'Échec de la récupération des factures de vente')
    return { data: [] }
  }
}

export async function getDashboardDocuments(limit: number = 100): Promise<{ data: DocumentWithComputed[] }> {
  try {
    const documents = await prisma.docVente.findMany({
      include: {
        partenaire: { select: { nom_partenaire: true, type_partenaire: true } }
      },
      orderBy: { date_document: 'desc' },
      take: limit
    })
    return { data: documents.map(mapDocumentToComputed) }
  } catch (error) {
    log.error({ error }, 'Échec de la récupération des documents du tableau de bord')
    return { data: [] }
  }
}
