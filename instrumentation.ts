export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnvironment } = await import('@/lib/config/env-validation')
    assertEnvironment()

    const { startWorkers } = await import('@/lib/workers')
    startWorkers()
  }
}
