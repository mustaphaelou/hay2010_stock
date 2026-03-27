import { z } from 'zod'

const passwordSchema = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis')
})

export const registerSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: passwordSchema,
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword']
})

export const toggleArticleStatusSchema = z.object({
  id_produit: z.number().int().positive('Product ID must be a positive integer'),
  newStatus: z.boolean()
})

export const getDocLinesSchema = z.object({
  docId: z.number().int().positive('Document ID must be a positive integer')
})

export const getDocumentsByAffaireSchema = z.object({
  code_affaire: z.string().min(1, 'Affaire code is required')
})

export const getPartnersSchema = z.object({
  type: z.enum(['CLIENT', 'FOURNISSEUR', 'all']).optional()
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ToggleArticleStatusInput = z.infer<typeof toggleArticleStatusSchema>
export type GetDocLinesInput = z.infer<typeof getDocLinesSchema>
export type GetDocumentsByAffaireInput = z.infer<typeof getDocumentsByAffaireSchema>
export type GetPartnersInput = z.infer<typeof getPartnersSchema>
