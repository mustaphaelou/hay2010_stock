import type { InvoiceData } from './invoice-template'

export { transformToInvoiceData } from './generate-invoice'
export type { InvoiceData, InvoiceLineItem, InvoiceCompany } from './invoice-template'

export async function generateInvoicePdfBuffer(data: InvoiceData): Promise<Uint8Array> {
  const [{ pdf }, { InvoiceDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./invoice-template'),
  ])
  const doc = <InvoiceDocument data={data} />
  const buffer = await pdf(doc).toBuffer()
  return new Uint8Array(buffer)
}
