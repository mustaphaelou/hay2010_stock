import client from 'prom-client'

const collectDefaultMetrics = client.collectDefaultMetrics
const Registry = client.Registry

let registry: client.Registry | null = null
let httpRequestsTotal: client.Counter<string> | null = null
let httpRequestDuration: client.Histogram<string> | null = null
let httpRequestsInFlight: client.Gauge<string> | null = null
let dbQueryDuration: client.Histogram<string> | null = null

export function getMetrics() {
  if (!registry) {
    registry = new Registry()

    collectDefaultMetrics({ register: registry })

    httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [registry]
    })

    httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [registry]
    })

    httpRequestsInFlight = new client.Gauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method'],
      registers: [registry]
    })

    dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [registry]
    })
  }

  return {
    registry,
    httpRequestsTotal,
    httpRequestDuration,
    httpRequestsInFlight,
    dbQueryDuration
  }
}
