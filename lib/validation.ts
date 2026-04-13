import { z } from 'zod'

/**
 * Password validation schema with security requirements.
 * - Minimum 8 characters
 * - Maximum 100 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 */
const passwordSchema = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')

/**
 * Login input validation schema.
 * Validates email format and password presence.
 */
export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis')
})

/**
 * Registration input validation schema.
 * Includes password complexity requirements.
 */
export const registerSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: passwordSchema,
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères')
})

/**
 * Article status toggle validation schema.
 */
export const toggleArticleStatusSchema = z.object({
  id_produit: z.number().int().positive('Product ID must be a positive integer'),
  newStatus: z.boolean()
})

/**
 * Document lines fetch validation schema.
 */
export const getDocLinesSchema = z.object({
  docId: z.number().int().positive('Document ID must be a positive integer')
})

/**
 * Documents by affaire validation schema.
 */
export const getDocumentsByAffaireSchema = z.object({
  code_affaire: z.string().min(1, 'Affaire code is required')
})

/**
 * Partners list query validation schema.
 * Supports filtering by partner type and pagination.
 */
export const getPartnersSchema = z.object({
  type: z.enum(['CLIENT', 'FOURNISSEUR', 'LES_DEUX', 'all']).optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(50).optional()
})

/**
 * Generic pagination validation schema.
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(50).optional()
})

/** Login input type derived from loginSchema */
export type LoginInput = z.infer<typeof loginSchema>

/** Registration input type derived from registerSchema */
export type RegisterInput = z.infer<typeof registerSchema>

/** Toggle article status input type */
export type ToggleArticleStatusInput = z.infer<typeof toggleArticleStatusSchema>

/** Get document lines input type */
export type GetDocLinesInput = z.infer<typeof getDocLinesSchema>

/** Get documents by affaire input type */
export type GetDocumentsByAffaireInput = z.infer<typeof getDocumentsByAffaireSchema>

/** Get partners input type */
export type GetPartnersInput = z.infer<typeof getPartnersSchema>

/** Pagination input type */
export type PaginationInput = z.infer<typeof paginationSchema>
