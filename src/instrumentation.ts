/**
 * Next.js Instrumentation — runs once at server startup.
 * Used to ensure database schema is up-to-date before handling requests.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initDatabase } = await import('@/lib/db-init')
      await initDatabase()
    } catch (error) {
      console.error('[Instrumentation] DB init failed:', error)
    }
  }
}
