/**
 * Document type constants for ERP system
 */
export const DOCUMENT_TYPES = {
  // Sales documents
  DEVIS: '0',
  BON_COMMANDE: '1',
  BON_LIVRAISON: '2',
  FACTURE: '3',
  AVOIR: '4',
  // Purchase documents
  BON_RECEPTION: '16',
  FACTURE_ACHAT: '17',
  AVOIR_ACHAT: '18',
  // Stock documents
  ENTREE_STOCK: '30',
  SORTIE_STOCK: '31',
  TRANSFERT_STOCK: '32',
} as const

export const DOCUMENT_TYPE_NAMES: Record<string, string> = {
  '0': 'DEVIS',
  '1': 'BON COMMANDE',
  '2': 'BON LIVRAISON',
  '3': 'FACTURE',
  '4': 'AVOIR',
  '16': 'BON RÉCEPTION',
  '17': 'FACTURE ACHAT',
  '18': 'AVOIR ACHAT',
  '30': 'ENTRÉE STOCK',
  '31': 'SORTIE STOCK',
  '32': 'TRANSFERT STOCK',
}

export function getDocumentTypeName(typeCode: string | number): string {
  return DOCUMENT_TYPE_NAMES[String(typeCode)] ?? 'INCONNU'
}

export const SALES_DOCUMENT_TYPES = ['0', '1', '2', '3', '4']
export const PURCHASE_DOCUMENT_TYPES = ['16', '17', '18']
export const STOCK_DOCUMENT_TYPES = ['30', '31', '32']
