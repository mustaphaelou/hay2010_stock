import { z } from 'zod'

export const getDocLinesSchema = z.object({
  docId: z.number().int().positive('Document ID must be a positive integer')
})

export const getDocumentsByAffaireSchema = z.object({
  code_affaire: z.string().min(1, 'Affaire code is required')
})

export type GetDocLinesInput = z.infer<typeof getDocLinesSchema>
export type GetDocumentsByAffaireInput = z.infer<typeof getDocumentsByAffaireSchema>
