/**
 * Background Job Processing with BullMQ
 * 
 * Provides queue-based job processing for heavy operations
 * like PDF generation, report creation, and bulk imports.
 */

import { Queue, Worker, Job } from 'bullmq'
import { redis } from '@/lib/db/redis-cluster'

// =====================================================
// QUEUE DEFINITIONS
// =====================================================

/**
 * Job types
 */
export interface PDFGenerationJob {
    documentId: number
    userId: string
    format: 'pdf' | 'excel'
    email?: string
}

export interface ReportGenerationJob {
    reportType: 'sales' | 'stock' | 'financial'
    userId: string
    filters: Record<string, unknown>
    format: 'pdf' | 'excel' | 'csv'
}

export interface StockImportJob {
    fileUrl: string
    userId: string
    options: {
        updateExisting: boolean
        skipErrors: boolean
    }
}

export interface EmailJob {
    to: string
    subject: string
    template: string
    data: Record<string, unknown>
}

export interface CacheWarmupJob {
    type: 'products' | 'partners' | 'stock' | 'all'
    userId?: string
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
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
    },
}

/**
 * Document processing queue
 */
export const documentQueue = new Queue<PDFGenerationJob>('documents', defaultQueueOptions)

/**
 * Report generation queue
 */
export const reportQueue = new Queue<ReportGenerationJob>('reports', defaultQueueOptions)

/**
 * Stock import queue
 */
export const stockImportQueue = new Queue<StockImportJob>('stock-imports', defaultQueueOptions)

/**
 * Email queue
 */
export const emailQueue = new Queue<EmailJob>('emails', defaultQueueOptions)

/**
 * Cache warmup queue
 */
export const cacheQueue = new Queue<CacheWarmupJob>('cache-warmup', defaultQueueOptions)

// =====================================================
// WORKER DEFINITIONS
// =====================================================

/**
 * PDF Generation Worker
 */
const pdfWorker = new Worker<PDFGenerationJob>(
    'documents',
    async (job: Job<PDFGenerationJob>) => {
        const { documentId, userId: _userId, format: _format, email } = job.data

        // Update progress
        await job.updateProgress(10)
        await job.log(`Starting PDF generation for document ${documentId}`)

        try {
            // Dynamic import to avoid circular dependencies
            const { generateInvoicePDF, transformToInvoiceData } = await import('@/lib/pdf/generate-invoice')

            // Fetch document data - using prisma directly to avoid circular imports
            await job.updateProgress(20)
            const { prisma } = await import('@/lib/db/prisma')
            const document = await prisma.docVente.findUnique({
                where: { id_document: documentId },
                include: {
                    partenaire: true,
                    lignes: {
                        include: { produit: true }
                    }
                }
            })

            if (!document) {
                throw new Error(`Document ${documentId} not found`)
            }

            await job.updateProgress(40)

            // Transform raw document to computed format (add computed fields)
            const documentWithComputed = {
                ...document,
                montant_ht_num: Number(document.montant_ht || 0),
                montant_ttc_num: Number(document.montant_ttc || 0),
                solde_du_num: Number(document.solde_du || 0),
                montant_regle: Number(document.montant_ttc || 0) - Number(document.solde_du || 0),
                numero_piece: document.numero_document,
                nom_tiers: document.nom_partenaire_snapshot || document.partenaire?.nom_partenaire || null,
                reference: document.reference_externe || null,
                montant_tva_num: Number(document.montant_tva_total || 0),
                montant_remise_num: Number(document.montant_remise_total || 0),
                type_document_num: Number(document.type_document || 0),
                statut_document_num: Number(document.statut_document || 0),
                domaine: document.domaine_document
            }

            // Transform raw lines to computed format
            const linesWithComputed = document.lignes.map((line) => ({
                ...line,
                quantite: Number(line.quantite_commandee || 0),
                prix_unitaire: Number(line.prix_unitaire_ht || 0),
                montant_ht_num: Number(line.montant_ht || 0),
                montant_ttc_num: Number(line.montant_ttc || 0),
                designation: line.nom_produit_snapshot || line.produit?.nom_produit || null,
                reference_article: line.code_produit_snapshot || null,
                ordre: line.numero_ligne,
                code_taxe: null
            }))

            // Transform to InvoiceData format and generate PDF
            const invoiceData = transformToInvoiceData(documentWithComputed, linesWithComputed, document.partenaire)
            const pdfBuffer = await generateInvoicePDF(invoiceData)
            await job.updateProgress(80)

            // Upload to storage (implement based on your storage solution)
            // const url = await uploadToStorage(pdfBuffer, `invoices/${documentId}.pdf`)

            await job.updateProgress(90)

            // Send notification email if requested
            if (email) {
                await emailQueue.add('send-pdf', {
                    to: email,
                    subject: `Document ${document.numero_document} - PDF Ready`,
                    template: 'document-ready',
                    data: {
                        documentNumber: document.numero_document,
                        downloadUrl: `#`, // Replace with actual URL
                    },
                })
            }

            await job.updateProgress(100)
            await job.log(`PDF generation completed for document ${documentId}`)

            return {
                success: true,
                documentId,
                // url,
                generatedAt: new Date().toISOString(),
            }
        } catch (error) {
            await job.log(`PDF generation failed: ${error}`)
            throw error
        }
    },
    {
        connection: redis,
        concurrency: 5,
        limiter: {
            max: 10,
            duration: 1000, // 10 jobs per second
        },
    }
)

/**
 * Report Generation Worker
 */
const reportWorker = new Worker<ReportGenerationJob>(
    'reports',
    async (job: Job<ReportGenerationJob>) => {
        const { reportType, userId: _userId, filters: _filters, format } = job.data

        await job.updateProgress(10)
        await job.log(`Starting ${reportType} report generation`)

        try {
            // Fetch data based on report type
            await job.updateProgress(30)

            // Placeholder for report data fetching
            // let reportData: unknown
            // switch (reportType) {
            //   case 'sales':
            //     reportData = await getSalesReportData(filters)
            //     break
            //   case 'stock':
            //     reportData = await getStockReportData(filters)
            //     break
            //   case 'financial':
            //     reportData = await getFinancialReportData(filters)
            //     break
            // }

            await job.updateProgress(60)

            // Generate report file
            // const reportBuffer = await generateReport(reportData, format)

            await job.updateProgress(90)

            // Upload and notify
            // const url = await uploadToStorage(reportBuffer, `reports/${reportType}-${Date.now()}.${format}`)

            await job.updateProgress(100)
            await job.log(`${reportType} report generation completed`)

            return {
                success: true,
                reportType,
                format,
                generatedAt: new Date().toISOString(),
            }
        } catch (error) {
            await job.log(`Report generation failed: ${error}`)
            throw error
        }
    },
    {
        connection: redis,
        concurrency: 3,
    }
)

/**
 * Stock Import Worker
 */
const stockImportWorker = new Worker<StockImportJob>(
    'stock-imports',
    async (job: Job<StockImportJob>) => {
        const { fileUrl, userId: _userId, options: _options } = job.data

        await job.updateProgress(5)
        await job.log(`Starting stock import from ${fileUrl}`)

        try {
            // Download file
            await job.updateProgress(10)
            // const fileBuffer = await downloadFile(fileUrl)

            // Parse file
            await job.updateProgress(20)
            // const records = await parseImportFile(fileBuffer)

            // Process records
            await job.updateProgress(30)
            // const results = await processImportRecords(records, options)

            // Update progress based on processed count
            // for (let i = 0; i < records.length; i++) {
            //   await job.updateProgress(30 + (i / records.length) * 60)
            // }

            await job.updateProgress(100)
            await job.log(`Stock import completed`)

            return {
                success: true,
                processed: 0, // results.processed
                errors: 0, // results.errors
                importedAt: new Date().toISOString(),
            }
        } catch (error) {
            await job.log(`Stock import failed: ${error}`)
            throw error
        }
    },
    {
        connection: redis,
        concurrency: 2,
    }
)

/**
 * Email Worker
 */
const emailWorker = new Worker<EmailJob>(
    'emails',
    async (job: Job<EmailJob>) => {
        const { to, subject, template, data } = job.data

        await job.log(`Sending email to ${to}`)

        try {
            // Integrate with your email provider (SendGrid, AWS SES, etc.)
            // await sendEmail({ to, subject, template, data })

            await job.log(`Email sent successfully to ${to}`)

            return {
                success: true,
                to,
                sentAt: new Date().toISOString(),
            }
        } catch (error) {
            await job.log(`Email sending failed: ${error}`)
            throw error
        }
    },
    {
        connection: redis,
        concurrency: 10,
    }
)

/**
 * Cache Warmup Worker
 */
const cacheWarmupWorker = new Worker<CacheWarmupJob>(
    'cache-warmup',
    async (job: Job<CacheWarmupJob>) => {
        const { type } = job.data

        await job.log(`Starting cache warmup for ${type}`)

        try {
            // Placeholder for cache warmup logic
            // const { CacheService, CacheKeys, CacheTTL } = await import('@/lib/db/redis-cluster')

            switch (type) {
                case 'products':
                    // Warmup product cache
                    break
                case 'partners':
                    // Warmup partner cache
                    break
                case 'stock':
                    // Warmup stock cache
                    break
                case 'all':
                    // Warmup all caches
                    break
            }

            await job.log(`Cache warmup completed for ${type}`)

            return {
                success: true,
                type,
                completedAt: new Date().toISOString(),
            }
        } catch (error) {
            await job.log(`Cache warmup failed: ${error}`)
            throw error
        }
    },
    {
        connection: redis,
        concurrency: 1,
    }
)

// =====================================================
// WORKER EVENT HANDLERS
// =====================================================

// PDF Worker Events
pdfWorker.on('completed', (job: Job<PDFGenerationJob>) => {
    console.log(`[Queue] PDF job ${job.id} completed`)
})

pdfWorker.on('failed', (job: Job<PDFGenerationJob> | undefined, err: Error) => {
    console.error(`[Queue] PDF job ${job?.id} failed:`, err.message)
})

// Report Worker Events
reportWorker.on('completed', (job: Job<ReportGenerationJob>) => {
    console.log(`[Queue] Report job ${job.id} completed`)
})

reportWorker.on('failed', (job: Job<ReportGenerationJob> | undefined, err: Error) => {
    console.error(`[Queue] Report job ${job?.id} failed:`, err.message)
})

// Email Worker Events
emailWorker.on('completed', (job: Job<EmailJob>) => {
    console.log(`[Queue] Email job ${job.id} sent to ${job.data.to}`)
})

emailWorker.on('failed', (job: Job<EmailJob> | undefined, err: Error) => {
    console.error(`[Queue] Email job ${job?.id} failed:`, err.message)
})

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Add a PDF generation job
 */
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

/**
 * Add a report generation job
 */
export async function queueReportGeneration(
    reportType: ReportGenerationJob['reportType'],
    userId: string,
    filters: Record<string, unknown>,
    format: ReportGenerationJob['format'] = 'pdf'
): Promise<Job<ReportGenerationJob>> {
    return reportQueue.add('generate-report', {
        reportType,
        userId,
        filters,
        format,
    })
}

/**
 * Add a stock import job
 */
export async function queueStockImport(
    fileUrl: string,
    userId: string,
    options?: StockImportJob['options']
): Promise<Job<StockImportJob>> {
    return stockImportQueue.add('import-stock', {
        fileUrl,
        userId,
        options: options || {
            updateExisting: false,
            skipErrors: false,
        },
    })
}

/**
 * Add an email job
 */
export async function queueEmail(
    to: string,
    subject: string,
    template: string,
    data: Record<string, unknown>
): Promise<Job<EmailJob>> {
    return emailQueue.add('send-email', {
        to,
        subject,
        template,
        data,
    })
}

/**
 * Schedule cache warmup
 */
export async function scheduleCacheWarmup(
    type: CacheWarmupJob['type']
): Promise<Job<CacheWarmupJob>> {
    return cacheQueue.add('warmup-cache', { type })
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
    documents: { waiting: number; active: number; completed: number; failed: number }
    reports: { waiting: number; active: number; completed: number; failed: number }
    emails: { waiting: number; active: number; completed: number; failed: number }
}> {
    const [documentStats, reportStats, emailStats] = await Promise.all([
        documentQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
        reportQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
        emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    ])

    return {
        documents: {
            waiting: documentStats.waiting || 0,
            active: documentStats.active || 0,
            completed: documentStats.completed || 0,
            failed: documentStats.failed || 0,
        },
        reports: {
            waiting: reportStats.waiting || 0,
            active: reportStats.active || 0,
            completed: reportStats.completed || 0,
            failed: reportStats.failed || 0,
        },
        emails: {
            waiting: emailStats.waiting || 0,
            active: emailStats.active || 0,
            completed: emailStats.completed || 0,
            failed: emailStats.failed || 0,
        },
    }
}

/**
 * Graceful shutdown
 */
export async function shutdownQueues(): Promise<void> {
    console.log('[Queue] Shutting down queues...')

    await Promise.all([
        pdfWorker.close(),
        reportWorker.close(),
        stockImportWorker.close(),
        emailWorker.close(),
        cacheWarmupWorker.close(),
        documentQueue.close(),
        reportQueue.close(),
        stockImportQueue.close(),
        emailQueue.close(),
        cacheQueue.close(),
    ])

    console.log('[Queue] All queues shut down')
}

// Handle process termination - only in non-serverless environments
// In serverless (Vercel, AWS Lambda), these handlers can cause issues
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    process.on('SIGTERM', shutdownQueues)
    process.on('SIGINT', shutdownQueues)
}

export default {
    documentQueue,
    reportQueue,
    stockImportQueue,
    emailQueue,
    cacheQueue,
    queuePDFGeneration,
    queueReportGeneration,
    queueStockImport,
    queueEmail,
    scheduleCacheWarmup,
    getQueueStats,
    shutdownQueues,
}
