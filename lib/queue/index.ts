/**
 * Background Job Processing with BullMQ
 *
 * Provides queue-based job processing for heavy operations
 * like PDF generation, report creation, and bulk imports.
 * Consolidated module: queues, workers, helper functions,
 * and lifecycle management live here.
 */

import { Queue, Worker, Job } from 'bullmq'
import { redis } from '@/lib/db/redis'
import { createLogger } from '@/lib/logger'

const log = createLogger('queue')

// =====================================================
// JOB TYPE DEFINITIONS
// =====================================================

export interface PDFGenerationJob {
    documentId: number
    userId: string
    format: 'pdf' | 'excel'
    email?: string
}

export interface EmailJob {
    to: string
    subject: string
    template: string
    data: Record<string, unknown>
}

// =====================================================
// QUEUE INSTANCES
// =====================================================

const defaultQueueOptions = {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential' as const,
            delay: 1000,
        },
        removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 3600,
        },
    },
}

export const documentQueue = new Queue<PDFGenerationJob>('documents', defaultQueueOptions)
export const emailQueue = new Queue<EmailJob>('emails', defaultQueueOptions)

// =====================================================
// WORKER LIFECYCLE
// =====================================================

let workersStarted = false
let workers: Worker[] = []

export function startWorkers(): void {
  if (workersStarted) {
    log.info('Workers already started, skipping')
    return
  }
  workersStarted = true

  const pdfWorker = new Worker<PDFGenerationJob>(
    'documents',
    async (job: Job<PDFGenerationJob>) => {
      const { documentId, email } = job.data

      await job.updateProgress(10)
      await job.log(`Starting PDF generation for document ${documentId}`)

      try {
        const { transformToInvoiceData } = await import('@/lib/pdf/generate-invoice')
        const { generateInvoicePdfBuffer } = await import('@/lib/pdf/generate-invoice')
        const { getDocumentWithLinesAndPartner } = await import('@/lib/documents/document-service')

        await job.updateProgress(20)

        const result = await getDocumentWithLinesAndPartner(documentId)
        if (result.error) {
          throw new Error(result.error)
        }

        const { document: documentWithComputed, lignes: linesWithComputed, partenaire } = result.data!

        await job.updateProgress(40)

        const invoiceData = transformToInvoiceData(documentWithComputed, linesWithComputed, partenaire)
        await generateInvoicePdfBuffer(invoiceData)

        await job.updateProgress(80)

        if (email) {
          await emailQueue.add('send-pdf', {
            to: email,
            subject: `Document ${documentWithComputed.numero_document} - PDF Ready`,
            template: 'document-ready',
            data: {
              documentNumber: documentWithComputed.numero_document,
              downloadUrl: '#',
            },
          })
        }

        await job.updateProgress(100)
        await job.log(`PDF generation completed for document ${documentId}`)

        return {
          success: true,
          documentId,
          generatedAt: new Date().toISOString(),
        }
      } catch (error) {
        await job.log(`PDF generation failed: ${error}`)
        throw error
      }
    },
    {
      connection: redis,
      concurrency: parseInt(process.env.PDF_WORKER_CONCURRENCY || '5', 10),
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  )



  workers = [pdfWorker]

  workers.forEach((worker) => {
    worker.on('completed', (job) => {
      log.info({ jobId: job.id }, 'Job completed')
    })

    worker.on('failed', (job, err) => {
      log.error({ jobId: job?.id, error: err.message }, 'Job failed')
    })

    worker.on('error', (err) => {
      log.error({ error: err.message }, 'Worker error')
    })
  })

  log.info('Workers started')
}

export async function stopWorkers(): Promise<void> {
  if (!workersStarted) return

  log.info('Shutting down workers...')

  await Promise.all(workers.map((w) => w.close()))

  workersStarted = false
  workers = []

  log.info('Workers shut down')
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export async function queuePDFGeneration(
    documentId: number,
    userId: string,
    options?: { format?: 'pdf' | 'excel'; email?: string }
): Promise<Job<PDFGenerationJob>> {
    return documentQueue.add('generate-pdf', {
        documentId,
        userId,
        format: options?.format || 'pdf',
        email: options?.email,
    })
}



export async function shutdownQueues(): Promise<void> {
  log.info('Shutting down queues...')

  await stopWorkers()

  await Promise.all([
    documentQueue.close(),
    emailQueue.close(),
  ])

  log.info('All queues shut down')
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    process.on('SIGTERM', shutdownQueues)
    process.on('SIGINT', shutdownQueues)
}
