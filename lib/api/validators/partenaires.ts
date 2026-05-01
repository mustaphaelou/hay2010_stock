import { z } from 'zod'

export const partnerCreateSchema = z.object({
  code_partenaire: z.string().min(1).max(50),
  nom_partenaire: z.string().min(1).max(255),
  type_partenaire: z.enum(['CLIENT', 'FOURNISSEUR', 'LES_DEUX']).default('CLIENT'),
  adresse_email: z.string().email().max(255).nullable().optional(),
  numero_telephone: z.string().max(50).nullable().optional(),
  numero_fax: z.string().max(50).nullable().optional(),
  url_site_web: z.string().max(255).nullable().optional(),
  adresse_rue: z.string().nullable().optional(),
  code_postal: z.string().max(20).nullable().optional(),
  ville: z.string().max(100).nullable().optional(),
  pays: z.string().max(100).default('Maroc').optional(),
  numero_tva: z.string().max(50).nullable().optional(),
  numero_ice: z.string().max(50).nullable().optional(),
  numero_rc: z.string().max(50).nullable().optional(),
  delai_paiement_jours: z.number().int().positive().nullable().optional(),
  limite_credit: z.number().positive().nullable().optional(),
  pourcentage_remise: z.number().min(0).max(100).default(0).optional(),
  numero_compte_bancaire: z.string().max(50).nullable().optional(),
  code_banque: z.string().max(20).nullable().optional(),
  numero_iban: z.string().max(50).nullable().optional(),
  code_swift: z.string().max(20).nullable().optional(),
  est_actif: z.boolean().default(true).optional(),
  compte_collectif: z.string().max(20).nullable().optional(),
  compte_auxiliaire: z.string().max(20).nullable().optional(),
})

export const partnerUpdateSchema = partnerCreateSchema.partial()

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type PartnerCreateInput = z.infer<typeof partnerCreateSchema>
export type PartnerUpdateInput = z.infer<typeof partnerUpdateSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
