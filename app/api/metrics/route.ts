import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization'
import { getBusinessMetrics } from '@/lib/monitoring/business-metrics'
import { getMetrics } from '@/lib/monitoring/metrics-registry'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requirePermission('reports:view')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    const isForbidden = message.startsWith('Forbidden')
    return NextResponse.json(
      { status: 'error', error: message },
      { status: isForbidden ? 403 : 401 }
    )
  }

  const { registry: systemRegistry } = getMetrics()

  try {
    const systemMetrics = await systemRegistry.metrics()
    const businessMetrics = await getBusinessMetrics()

    const combinedMetrics = `${systemMetrics}\n\n# Business Metrics\n${businessMetrics}`

    return new NextResponse(combinedMetrics, {
      status: 200,
      headers: {
        'Content-Type': systemRegistry.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        status: 'error',
        error: `Failed to collect metrics: ${errorMessage}`,
      },
      { status: 500 }
    )
  }
}
