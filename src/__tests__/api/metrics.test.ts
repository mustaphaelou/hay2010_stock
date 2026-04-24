import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockRequirePermission } = vi.hoisted(() => ({
  mockRequirePermission: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' }),
}))

const { mockGetMetrics } = vi.hoisted(() => ({
  mockGetMetrics: vi.fn().mockReturnValue({
    registry: {
      metrics: vi.fn().mockResolvedValue('# HELP http_requests_total Total\n# TYPE http_requests_total counter\nhttp_requests_total 0\n'),
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
    },
  }),
}))

const { mockGetBusinessMetrics } = vi.hoisted(() => ({
  mockGetBusinessMetrics: vi.fn().mockResolvedValue('# Business Metrics\nstock_movements_total 0\n'),
}))

vi.mock('@/lib/auth/authorization', () => ({
  requirePermission: mockRequirePermission,
}))

vi.mock('@/lib/monitoring/metrics-registry', () => ({
  getMetrics: mockGetMetrics,
}))

vi.mock('@/lib/monitoring/business-metrics', () => ({
  getBusinessMetrics: mockGetBusinessMetrics,
}))

import { GET } from '@/app/api/metrics/route'

describe('Metrics API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequirePermission.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' })
  })

  it('should require reports:view permission', async () => {
    mockRequirePermission.mockRejectedValue(new Error('Unauthorized'))

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('should return 403 for forbidden role', async () => {
    mockRequirePermission.mockRejectedValue(new Error('Forbidden'))

    const response = await GET()

    expect(response.status).toBe(403)
  })

  it('should return combined metrics with correct content type', async () => {
    const response = await GET()
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/plain')
    expect(text).toContain('http_requests_total')
    expect(text).toContain('Business Metrics')
  })

  it('should set no-cache headers', async () => {
    const response = await GET()

    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    expect(response.headers.get('Pragma')).toBe('no-cache')
  })

  it('should return 500 when metrics collection fails', async () => {
    mockGetMetrics.mockReturnValueOnce({
      registry: {
        metrics: vi.fn().mockRejectedValue(new Error('metrics error')),
        contentType: 'text/plain',
      },
    })

    const response = await GET()

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toContain('Failed to collect metrics')
  })
})
