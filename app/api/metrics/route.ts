import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/user-utils'
import { getBusinessMetrics } from '@/lib/monitoring/business-metrics'
import { getMetrics } from '@/lib/monitoring/metrics-registry'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        await requireAuth()
    } catch {
        return NextResponse.json(
            { status: 'error', error: 'Unauthorized' },
            { status: 401 }
        )
    }

    const { registry: systemRegistry } = getMetrics()

  try {
    // Collect system metrics
    const systemMetrics = await systemRegistry.metrics()
    
    // Collect business metrics
    const businessMetrics = await getBusinessMetrics()
    
    // Combine both metrics
    const combinedMetrics = `${systemMetrics}\n\n# Business Metrics\n${businessMetrics}`

    return new NextResponse(combinedMetrics, {
      status: 200,
      headers: {
        'Content-Type': systemRegistry.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        status: 'error',
        error: `Failed to collect metrics: ${errorMessage}`
      },
      { status: 500 }
    )
  }
}
